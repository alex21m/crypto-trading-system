"""
backend/bot_engine.py
Trading bot: signal evaluation, order execution (paper + live Binance Futures)
HMAC-signed requests to Binance /fapi endpoints for live mode.
"""

import os
import json
import time
import hmac
import hashlib
import threading
import requests
from datetime import datetime, timezone
from typing import Optional

import db

BINANCE_FAPI = "https://fapi.binance.com"
TESTNET_FAPI = "https://testnet.binancefuture.com"


class BotEngine:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.running = False
        self.mode = os.getenv("PAPER_TRADING", "true").lower() != "false"  # True = paper
        self.api_key = os.getenv("BINANCE_API_KEY", "")
        self.api_secret = os.getenv("BINANCE_API_SECRET", "")
        self.testnet = os.getenv("BINANCE_TESTNET", "true").lower() == "true"
        self.base_url = TESTNET_FAPI if self.testnet else BINANCE_FAPI

        # Config (overridable via /api/bot/start payload)
        self.config = {
            "strategy": "ai",
            "leverage": int(os.getenv("DEFAULT_LEVERAGE", 10)),
            "position_size_pct": float(os.getenv("MAX_POSITION_SIZE_PCT", 5)),
            "stop_loss_pct": 1.5,
            "take_profit_pct": 3.0,
            "max_open_positions": 3,
            "max_daily_loss_pct": float(os.getenv("MAX_DAILY_LOSS_PCT", 3)),
            "min_confidence": 70,
            "pairs": ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
        }
        self.balance = 10000.0
        self.total_pnl = 0.0
        self.daily_loss = 0.0
        self.wins = 0
        self.total_trades = 0
        self.open_positions: dict = {}
        self._thread: Optional[threading.Thread] = None
        self._adapt_count = 0

    @classmethod
    def get_instance(cls) -> "BotEngine":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = BotEngine()
        return cls._instance

    # ── Public class methods (called from app.py) ─────────────────────────────
    @classmethod
    def get_status(cls) -> dict:
        b = cls.get_instance()
        wr = round(b.wins / b.total_trades * 100, 1) if b.total_trades else 0
        return {
            "running": b.running,
            "mode": "paper" if b.mode else "live",
            "balance": round(b.balance, 2),
            "total_pnl": round(b.total_pnl, 2),
            "win_rate": wr,
            "total_trades": b.total_trades,
            "open_positions": len(b.open_positions),
            "adapt_count": b._adapt_count,
            "config": b.config,
        }

    @classmethod
    def start(cls, config: dict) -> dict:
        b = cls.get_instance()
        if b.running:
            return {"error": "already running"}
        b.config.update({k: v for k, v in config.items() if k in b.config})
        if "mode" in config:
            b.mode = config["mode"] != "live"
        b.running = True
        b._thread = threading.Thread(target=b._bot_loop, daemon=True)
        b._thread.start()
        return {"status": "started", "config": b.config}

    @classmethod
    def stop(cls) -> dict:
        b = cls.get_instance()
        b.running = False
        return {"status": "stopped", "total_pnl": round(b.total_pnl, 2)}

    @classmethod
    def execute_order(cls, symbol: str, side: str, qty: float) -> dict:
        b = cls.get_instance()
        return b._place_order(symbol, side, qty)

    # ── Bot loop ──────────────────────────────────────────────────────────────
    def _bot_loop(self):
        from agents.simulation import MarketModel
        while self.running:
            try:
                self._tick()
            except Exception as e:
                print(f"[bot] tick error: {e}")
            time.sleep(4)

    def _tick(self):
        from data_pipeline import DataPipeline
        pipeline = DataPipeline()
        max_open = self.config["max_open_positions"]
        if len(self.open_positions) >= max_open:
            return
        loss_limit = self.config["max_daily_loss_pct"] / 100
        if self.balance > 0 and abs(self.daily_loss) / self.balance > loss_limit:
            print("[bot] daily loss limit hit — pausing")
            self.running = False
            return

        for symbol in self.config["pairs"]:
            data = pipeline.get_symbol(symbol)
            if not data:
                continue
            sig = self._compute_signal(data)
            if sig["direction"] and sig["confidence"] >= self.config["min_confidence"]:
                self._open_position(symbol, sig["direction"], data["price"], sig)

    def _compute_signal(self, data: dict) -> dict:
        price = data["price"]
        chg = data["change_pct"]
        # Synthetic indicators derived from available data
        rsi = max(0, min(100, 50 + chg * 3 + (hash(str(price)) % 20 - 10)))
        macd = chg * 2 + (hash(str(price * 1.1)) % 40 - 20)
        vol_score = min(data.get("volume", 1), 3) / 3
        long_score = sum([
            rsi < 35, macd > 15, chg > 0.5, vol_score > 0.6,
        ])
        short_score = sum([
            rsi > 65, macd < -15, chg < -0.5,
        ])
        max_score = max(long_score, short_score)
        total = long_score + short_score or 1
        confidence = int(max_score / total * 100)
        direction = None
        strat = self.config["strategy"]
        if strat == "ai":
            if long_score >= 3:  direction = "LONG"
            elif short_score >= 2: direction = "SHORT"
        elif strat == "trend":
            if chg > 0.5 and long_score >= 2:  direction = "LONG"
            elif chg < -0.5 and short_score >= 2: direction = "SHORT"
        elif strat == "mean":
            if rsi < 33: direction = "LONG"
            elif rsi > 67: direction = "SHORT"
        elif strat == "macd":
            if macd > 20: direction = "LONG"
            elif macd < -20: direction = "SHORT"
        elif strat == "scalp":
            import random
            if random.random() > 0.65:
                direction = "LONG" if random.random() > 0.5 else "SHORT"
        return {"direction": direction, "confidence": confidence, "rsi": round(rsi, 1), "macd": round(macd, 2)}

    def _open_position(self, symbol: str, side: str, price: float, sig: dict):
        lev = self.config["leverage"]
        size_pct = self.config["position_size_pct"] / 100
        notional = self.balance * size_pct * lev
        qty = notional / price
        pos = {
            "symbol": symbol, "side": side, "entry": price,
            "qty": qty, "notional": notional, "sig": sig,
            "opened_at": time.time(),
        }
        self.open_positions[symbol] = pos
        print(f"[bot] OPEN {side} {symbol} @ {price:.4f} qty={qty:.4f} notional=${notional:.2f}")
        if not self.mode:  # live
            self._place_order(symbol, "BUY" if side == "LONG" else "SELL", qty)
        # Schedule close
        sl = self.config["stop_loss_pct"] / 100
        tp = self.config["take_profit_pct"] / 100
        hold = 8 + (hash(symbol) % 22)
        t = threading.Timer(hold, self._close_position, args=[symbol, price, sl, tp])
        t.daemon = True
        t.start()

    def _close_position(self, symbol: str, entry: float, sl_pct: float, tp_pct: float):
        pos = self.open_positions.pop(symbol, None)
        if not pos:
            return
        from data_pipeline import DataPipeline
        pipeline = DataPipeline()
        data = pipeline.get_symbol(symbol)
        exit_price = data["price"] if data else entry
        direction = pos["side"]
        pnl_pct = ((exit_price - entry) / entry) * (1 if direction == "LONG" else -1)
        pnl = pos["notional"] * pnl_pct
        self.balance += pnl
        self.total_pnl += pnl
        if pnl < 0:
            self.daily_loss += pnl
        if pnl > 0:
            self.wins += 1
        self.total_trades += 1
        trade = {
            "symbol": symbol, "side": direction,
            "entry": round(entry, 6), "exit": round(exit_price, 6),
            "qty": round(pos["qty"], 6), "pnl": round(pnl, 4),
            "strategy": self.config["strategy"],
            "ts": datetime.now(timezone.utc).isoformat(),
            "result": "WIN" if pnl > 0 else "LOSS",
        }
        r = db.get_redis()
        r.lpush("bot:trades", json.dumps(trade))
        r.ltrim("bot:trades", 0, 199)
        db.save_trade(
            symbol, direction, entry, exit_price,
            pos["qty"], pnl, self.config["strategy"],
            "paper" if self.mode else "live",
        )
        self._maybe_adapt()
        print(f"[bot] CLOSE {direction} {symbol} PNL=${pnl:.2f} ({'WIN' if pnl > 0 else 'LOSS'})")

    def _maybe_adapt(self):
        if self.total_trades < 8:
            return
        wr = self.wins / self.total_trades
        if wr < 0.40:
            strats = ["ai","trend","scalp","mean","macd","bb"]
            cur = self.config["strategy"]
            options = [s for s in strats if s != cur]
            import random
            self.config["strategy"] = random.choice(options)
            self._adapt_count += 1
            print(f"[bot] AI ADAPT: wr={wr:.0%} → switching to {self.config['strategy']}")

    # ── Binance Futures signed order ──────────────────────────────────────────
    def _sign(self, params: dict) -> str:
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return hmac.new(
            self.api_secret.encode(), query.encode(), hashlib.sha256
        ).hexdigest()

    def _place_order(self, symbol: str, side: str, qty: float) -> dict:
        if self.mode or not self.api_key:
            return {"status": "paper", "symbol": symbol, "side": side, "qty": qty}
        params = {
            "symbol": symbol,
            "side": side,
            "type": "MARKET",
            "quantity": round(qty, 3),
            "timestamp": int(time.time() * 1000),
        }
        params["signature"] = self._sign(params)
        try:
            resp = requests.post(
                f"{self.base_url}/fapi/v1/order",
                headers={"X-MBX-APIKEY": self.api_key},
                params=params,
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"[bot] order error: {e}")
            return {"error": str(e)}

    def _set_leverage(self, symbol: str, leverage: int):
        if self.mode or not self.api_key:
            return
        params = {"symbol": symbol, "leverage": leverage, "timestamp": int(time.time() * 1000)}
        params["signature"] = self._sign(params)
        try:
            requests.post(
                f"{self.base_url}/fapi/v1/leverage",
                headers={"X-MBX-APIKEY": self.api_key},
                params=params,
                timeout=10,
            )
        except Exception as e:
            print(f"[bot] leverage error: {e}")
