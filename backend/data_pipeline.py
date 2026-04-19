"""
backend/data_pipeline.py
Real-time data ingestion: Binance Futures REST + WebSocket, OKX, Redis cache
"""

import os
import json
import time
import hmac
import hashlib
import threading
import requests
import websocket
from datetime import datetime, timezone
from typing import Optional

import db

BINANCE_FAPI = "https://fapi.binance.com"
BINANCE_API  = "https://api.binance.com"
OKX_API      = "https://www.okx.com"

TOP_SYMBOLS = [
    "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT",
    "DOGEUSDT","ADAUSDT","AVAXUSDT","LINKUSDT","DOTUSDT",
    "LTCUSDT","MATICUSDT","NEARUSDT","ATOMUSDT","UNIUSDT",
    "AAVEUSDT","INJUSDT","SUIUSDT","ARBUSDT","OPUSDT",
]

CACHE_TTL = 5  # seconds


class DataPipeline:
    def __init__(self):
        self.redis = db.get_redis()
        self._cache: dict = {}
        self._ws_thread: Optional[threading.Thread] = None
        self._running = False
        self._start_rest_poll()
        self._start_ws()

    # ── REST polling (fallback + initial load) ────────────────────────────────
    def _start_rest_poll(self):
        def poll():
            while True:
                try:
                    self._fetch_binance_futures_tickers()
                except Exception as e:
                    print(f"[pipeline] REST poll error: {e}")
                time.sleep(10)
        t = threading.Thread(target=poll, daemon=True)
        t.start()

    def _fetch_binance_futures_tickers(self):
        resp = requests.get(f"{BINANCE_FAPI}/fapi/v1/ticker/24hr", timeout=10)
        resp.raise_for_status()
        tickers = resp.json()
        for t in tickers:
            sym = t["symbol"]
            if sym not in TOP_SYMBOLS:
                continue
            record = {
                "symbol": sym,
                "price": float(t["lastPrice"]),
                "change_pct": float(t["priceChangePercent"]),
                "volume": float(t["quoteVolume"]),
                "high": float(t["highPrice"]),
                "low": float(t["lowPrice"]),
                "open": float(t["openPrice"]),
                "source": "binance_futures",
                "ts": datetime.now(timezone.utc).isoformat(),
            }
            self._cache[sym] = record
            self.redis.setex(f"market:{sym}", CACHE_TTL * 6, json.dumps(record))
        # persist sorted gainers/losers
        sorted_by_chg = sorted(
            [v for v in self._cache.values()],
            key=lambda x: x["change_pct"],
            reverse=True,
        )
        self.redis.set("market:gainers", json.dumps(sorted_by_chg[:10]))
        self.redis.set("market:losers", json.dumps(sorted_by_chg[-10:][::-1]))

    # ── WebSocket (Binance stream) ────────────────────────────────────────────
    def _start_ws(self):
        streams = "/".join(f"{s.lower()}@miniTicker" for s in TOP_SYMBOLS)
        url = f"wss://stream.binance.com:9443/stream?streams={streams}"

        def on_message(ws, message):
            try:
                data = json.loads(message)
                tick = data.get("data", {})
                sym = tick.get("s")
                if sym and sym in TOP_SYMBOLS:
                    prev = self._cache.get(sym, {})
                    record = {
                        "symbol": sym,
                        "price": float(tick["c"]),
                        "change_pct": float(tick["P"]),
                        "volume": float(tick["q"]) / 1e6,
                        "high": float(tick["h"]),
                        "low": float(tick["l"]),
                        "open": float(tick["o"]),
                        "source": "binance_ws",
                        "ts": datetime.now(timezone.utc).isoformat(),
                    }
                    self._cache[sym] = record
                    self.redis.setex(f"market:{sym}", 30, json.dumps(record))
            except Exception as e:
                print(f"[ws] parse error: {e}")

        def on_error(ws, error):
            print(f"[ws] error: {error}")

        def on_close(ws, *args):
            print("[ws] closed — reconnecting in 3s")
            time.sleep(3)
            self._start_ws()

        def on_open(ws):
            print("[ws] Binance stream connected")

        def run():
            ws_app = websocket.WebSocketApp(
                url,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close,
                on_open=on_open,
            )
            ws_app.run_forever(ping_interval=30, ping_timeout=10)

        t = threading.Thread(target=run, daemon=True)
        t.start()

    # ── Public getters ─────────────────────────────────────────────────────────
    def get_latest(self) -> dict:
        return {sym: self._cache[sym] for sym in TOP_SYMBOLS if sym in self._cache}

    def get_symbol(self, symbol: str) -> Optional[dict]:
        cached = self.redis.get(f"market:{symbol}")
        if cached:
            return json.loads(cached)
        return self._cache.get(symbol)

    def get_gainers(self, limit=10) -> list:
        raw = self.redis.get("market:gainers")
        if raw:
            return json.loads(raw)[:limit]
        sorted_data = sorted(self._cache.values(), key=lambda x: x["change_pct"], reverse=True)
        return sorted_data[:limit]

    def get_losers(self, limit=10) -> list:
        raw = self.redis.get("market:losers")
        if raw:
            return json.loads(raw)[:limit]
        sorted_data = sorted(self._cache.values(), key=lambda x: x["change_pct"])
        return sorted_data[:limit]

    def get_klines(self, symbol: str, interval="5m", limit=100) -> list:
        """Fetch OHLCV candles from Binance Futures."""
        try:
            resp = requests.get(
                f"{BINANCE_FAPI}/fapi/v1/klines",
                params={"symbol": symbol, "interval": interval, "limit": limit},
                timeout=10,
            )
            resp.raise_for_status()
            raw = resp.json()
            return [
                {
                    "t": r[0], "o": float(r[1]), "h": float(r[2]),
                    "l": float(r[3]), "c": float(r[4]), "v": float(r[5]),
                }
                for r in raw
            ]
        except Exception as e:
            print(f"[klines] error: {e}")
            return []

    def get_order_book(self, symbol: str, limit=10) -> dict:
        try:
            resp = requests.get(
                f"{BINANCE_FAPI}/fapi/v1/depth",
                params={"symbol": symbol, "limit": limit},
                timeout=5,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"[ob] error: {e}")
            return {}

    def get_funding_rate(self, symbol: str) -> Optional[float]:
        try:
            resp = requests.get(
                f"{BINANCE_FAPI}/fapi/v1/fundingRate",
                params={"symbol": symbol, "limit": 1},
                timeout=5,
            )
            data = resp.json()
            return float(data[0]["fundingRate"]) if data else None
        except Exception:
            return None
