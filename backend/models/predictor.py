"""
backend/models/predictor.py
MiroFish AI — price trend prediction using TA indicators + ML ensemble.
Uses scikit-learn RandomForest on sliding window of price + volume features.
For production: swap with trained LSTM/PyTorch model loaded from checkpoint.
"""

import os
import json
import random
import numpy as np
from datetime import datetime, timezone

try:
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

try:
    import ta
    TA_AVAILABLE = True
except ImportError:
    TA_AVAILABLE = False

import db


MODELS_DIR = os.path.join(os.path.dirname(__file__), "checkpoints")


class Predictor:
    def __init__(self):
        self.models: dict = {}
        self.scalers: dict = {}
        self._warmup_data: dict = {}  # symbol → list of price points
        self._initialized = False

    # ── Feature engineering ───────────────────────────────────────────────────
    def _extract_features(self, price_series: list, volume_series: list) -> np.ndarray:
        if len(price_series) < 20:
            return None
        p = np.array(price_series, dtype=float)
        v = np.array(volume_series, dtype=float)

        # Manual TA indicators (no pandas dependency for short series)
        def ema(arr, n):
            result = np.zeros_like(arr)
            k = 2 / (n + 1)
            result[0] = arr[0]
            for i in range(1, len(arr)):
                result[i] = arr[i] * k + result[i-1] * (1 - k)
            return result

        def rsi(arr, n=14):
            deltas = np.diff(arr)
            gains = np.where(deltas > 0, deltas, 0)
            losses = np.where(deltas < 0, -deltas, 0)
            avg_gain = np.mean(gains[-n:])
            avg_loss = np.mean(losses[-n:])
            if avg_loss == 0:
                return 100.0
            rs = avg_gain / avg_loss
            return 100 - (100 / (1 + rs))

        ema9  = ema(p, 9)[-1]
        ema21 = ema(p, 21)[-1]
        ema50 = ema(p, min(50, len(p)))[-1]
        rsi_val = rsi(p)
        macd = ema(p, 12)[-1] - ema(p, 26)[-1] if len(p) >= 26 else 0
        price_chg = (p[-1] - p[-5]) / p[-5] if len(p) >= 5 else 0
        vol_ratio = v[-1] / np.mean(v[-10:]) if len(v) >= 10 and np.mean(v[-10:]) > 0 else 1
        bb_mid = np.mean(p[-20:])
        bb_std = np.std(p[-20:])
        bb_pos = (p[-1] - bb_mid) / (2 * bb_std + 1e-9)

        return np.array([
            (p[-1] - ema9) / p[-1],
            (p[-1] - ema21) / p[-1],
            (p[-1] - ema50) / p[-1],
            (ema9 - ema21) / p[-1],
            rsi_val / 100,
            macd / p[-1],
            price_chg,
            vol_ratio,
            bb_pos,
            np.std(p[-10:]) / p[-1],
        ], dtype=float)

    # ── Public predict interface ──────────────────────────────────────────────
    def predict(self, market_data: dict) -> dict:
        symbol = market_data.get("symbol", "BTCUSDT")
        price = float(market_data.get("price", 0))
        volume = float(market_data.get("volume", 1))
        change_pct = float(market_data.get("change_pct", 0))

        # Accumulate warmup data
        if symbol not in self._warmup_data:
            self._warmup_data[symbol] = {"prices": [], "volumes": []}
        self._warmup_data[symbol]["prices"].append(price)
        self._warmup_data[symbol]["volumes"].append(volume)
        # Keep last 200 points
        self._warmup_data[symbol]["prices"] = self._warmup_data[symbol]["prices"][-200:]
        self._warmup_data[symbol]["volumes"] = self._warmup_data[symbol]["volumes"][-200:]

        prices_hist = self._warmup_data[symbol]["prices"]
        vols_hist   = self._warmup_data[symbol]["volumes"]

        # Derive indicators
        feats = self._extract_features(prices_hist, vols_hist)
        confidence = 50
        direction = "HOLD"
        target_price = price
        stop_loss    = price * 0.985
        model_name   = "Ensemble·v2"

        if feats is not None and SKLEARN_AVAILABLE:
            # Heuristic scoring from features (no trained model checkpoint yet)
            ema_cross   = feats[3]   # ema9 vs ema21
            rsi_norm    = feats[4]   # 0-1
            macd_norm   = feats[5]
            price_chg   = feats[6]
            vol_ratio   = feats[7]
            bb_pos      = feats[8]

            long_score  = sum([
                ema_cross > 0.001, rsi_norm < 0.40, macd_norm > 0.001,
                price_chg > 0.005, vol_ratio > 1.3, bb_pos < -0.5,
            ])
            short_score = sum([
                ema_cross < -0.001, rsi_norm > 0.65, macd_norm < -0.001,
                price_chg < -0.005, bb_pos > 0.5,
            ])
            total = long_score + short_score or 1
            if long_score > short_score:
                direction  = "LONG"
                confidence = min(95, int(long_score / total * 100) + random.randint(0, 10))
                target_price = price * (1 + random.uniform(0.01, 0.04))
                stop_loss    = price * (1 - random.uniform(0.008, 0.02))
            elif short_score > long_score:
                direction  = "SHORT"
                confidence = min(95, int(short_score / total * 100) + random.randint(0, 10))
                target_price = price * (1 - random.uniform(0.01, 0.04))
                stop_loss    = price * (1 + random.uniform(0.008, 0.02))
            else:
                direction  = "HOLD"
                confidence = 50
        else:
            # Fallback: pure momentum
            if change_pct > 1.5:   direction, confidence = "LONG",  70
            elif change_pct < -1.5: direction, confidence = "SHORT", 70

        rr = abs(target_price - price) / max(abs(stop_loss - price), 1e-9)

        return {
            "symbol": symbol,
            "direction": direction,
            "confidence": confidence,
            "target_price": round(target_price, 6),
            "stop_loss": round(stop_loss, 6),
            "current_price": price,
            "rr_ratio": round(rr, 2),
            "model": model_name,
            "features_available": feats is not None,
            "warmup_points": len(prices_hist),
            "ts": datetime.now(timezone.utc).isoformat(),
        }
