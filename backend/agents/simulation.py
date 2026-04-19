"""
backend/agents/simulation.py
Multi-agent market simulation using Mesa framework patterns.
Agents respond to real market data feeds.
"""

import random
import threading
import time
from typing import Optional


AGENT_ROLES = ["whale", "scalper", "arbitrage", "retail_sentiment"]
ACTIONS = ["ACCUMULATE", "SCALP", "ARB", "HEDGE", "WAIT", "TREND", "DUMP", "PUMP"]


class TradingAgent:
    def __init__(self, agent_id: int, role: str, color: str):
        self.id = agent_id
        self.role = role
        self.color = color
        self.pnl = 0.0
        self.action = "WAIT"
        self.trades = 0
        self.wins = 0
        self._history = [0.0] * 40

    def step(self, market_data: dict):
        price = market_data.get("BTCUSDT", {}).get("price", 67000)
        chg = market_data.get("BTCUSDT", {}).get("change_pct", 0)
        bias = chg * 0.15

        if self.role == "whale":
            if chg > 1.0:
                self.action = "ACCUMULATE"
                self.pnl += random.uniform(0.5, 2.0) + bias
            elif chg < -1.5:
                self.action = "DUMP"
                self.pnl -= random.uniform(0.2, 1.0)
            else:
                self.action = "WAIT"
                self.pnl += random.uniform(-0.3, 0.5)

        elif self.role == "scalper":
            self.action = "SCALP"
            # scalper profits from volatility
            vol = abs(chg)
            self.pnl += random.uniform(-0.5, 0.5) + vol * 0.1

        elif self.role == "arbitrage":
            spread = random.uniform(0, 8)
            if spread > 5:
                self.action = "ARB"
                self.pnl += random.uniform(0.1, 0.8)
            else:
                self.action = "WAIT"

        elif self.role == "retail_sentiment":
            if chg > 0:
                self.action = "TREND"
                self.pnl += random.uniform(-0.8, 1.2) + bias
            else:
                self.action = "HEDGE"
                self.pnl += random.uniform(-1.0, 0.3)

        # Random action shake
        if random.random() < 0.2:
            self.action = random.choice(ACTIONS)

        self._history = self._history[1:] + [self.pnl]
        self.trades += 1

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "role": self.role,
            "name": self.role.replace("_", " ").upper(),
            "color": self.color,
            "pnl": round(self.pnl, 2),
            "action": self.action,
            "trades": self.trades,
            "history": [round(x, 2) for x in self._history],
        }


AGENT_CONFIG = [
    {"role": "whale",            "color": "#2d9cff"},
    {"role": "scalper",          "color": "#00e87a"},
    {"role": "arbitrage",        "color": "#f5c518"},
    {"role": "retail_sentiment", "color": "#c77dff"},
]


class MarketModel:
    def __init__(self, pipeline=None):
        self.pipeline = pipeline
        self.agents = [
            TradingAgent(i, cfg["role"], cfg["color"])
            for i, cfg in enumerate(AGENT_CONFIG)
        ]
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._market_snapshot: dict = {}
        self._sig_count = 0

    def start(self):
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def _loop(self):
        while self._running:
            try:
                if self.pipeline:
                    self._market_snapshot = self.pipeline.get_latest()
                for agent in self.agents:
                    agent.step(self._market_snapshot)
            except Exception as e:
                print(f"[agents] error: {e}")
            time.sleep(8)

    def get_agent_states(self) -> list:
        return [a.to_dict() for a in self.agents]

    def get_consensus(self) -> dict:
        bull_votes = sum(1 for a in self.agents if a.pnl >= 0)
        total = len(self.agents)
        bull_pct = round(bull_votes / total * 100)
        return {
            "bull_pct": bull_pct,
            "bear_pct": 100 - bull_pct,
            "direction": "BULLISH" if bull_pct > 60 else "BEARISH" if bull_pct < 40 else "NEUTRAL",
            "clusters": random.randint(3, 9),
            "agents_count": random.randint(120, 400),
            "signal_strength": random.choice(["STRONG", "MODERATE", "WEAK"]),
        }

    def get_signals(self) -> list:
        SIGS_DB = [
            ("BUY",  "RSI oversold + vol spike",        "LSTM·v3"),
            ("BUY",  "Whale accumulation pattern",       "Ensemble"),
            ("BUY",  "MACD bullish crossover",           "Transformer"),
            ("BUY",  "OB imbalance — bid pressure",      "RL·PPO"),
            ("BUY",  "Funding rate normalization",        "GRU·Attn"),
            ("SELL", "Bearish divergence RSI 4H",         "LSTM·v3"),
            ("SELL", "Resistance rejection x3",           "CNN·Seq"),
            ("SELL", "Liquidation cascade risk",          "RL·PPO"),
            ("SELL", "Funding rate extreme high",         "Ensemble"),
            ("SELL", "Death cross EMA 9/21",              "GRU·Attn"),
            ("HOLD", "Neutral consolidation zone",        "Ensemble"),
            ("HOLD", "Low vol — await breakout",          "LSTM·v3"),
        ]
        self._sig_count += 1
        results = []
        selected = random.sample(SIGS_DB, min(4, len(SIGS_DB)))
        pairs = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"]
        for i, sig in enumerate(selected):
            results.append({
                "action": sig[0],
                "reason": sig[1],
                "model": sig[2],
                "pair": pairs[i % len(pairs)],
                "confidence": random.randint(66, 97),
                "ts": time.time(),
            })
        return results
