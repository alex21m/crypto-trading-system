"""
crypto-trading-system — backend/app.py
Main Flask application: REST API + Socket.IO real-time feed
"""

import os
import json
import time
import hmac
import hashlib
import threading
from datetime import datetime
from functools import wraps

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv

from data_pipeline import DataPipeline
from agents.simulation import MarketModel
from models.predictor import Predictor
import db

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")
CORS(app, origins=["*"])
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

pipeline = DataPipeline()
market_model = MarketModel(pipeline)
predictor = Predictor()

# ── rate limit via Redis ──────────────────────────────────────────────────────
def rate_limit(max_calls=30, window=60):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            ip = request.remote_addr
            key = f"rl:{ip}:{fn.__name__}"
            r = db.get_redis()
            count = r.incr(key)
            if count == 1:
                r.expire(key, window)
            if count > max_calls:
                return jsonify({"error": "Rate limit exceeded"}), 429
            return fn(*args, **kwargs)
        return wrapper
    return decorator

# ── webhook HMAC auth ─────────────────────────────────────────────────────────
def verify_hmac(payload: bytes, sig_header: str) -> bool:
    secret = os.getenv("SECRET_KEY", "dev-secret").encode()
    expected = hmac.new(secret, payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig_header or "")

# ── REST endpoints ────────────────────────────────────────────────────────────
@app.route("/health")
def health():
    return jsonify({"status": "ok", "ts": datetime.utcnow().isoformat()})

@app.route("/api/markets")
@rate_limit(60, 60)
def get_markets():
    data = pipeline.get_latest()
    return jsonify(data)

@app.route("/api/markets/<symbol>")
@rate_limit(60, 60)
def get_market(symbol):
    data = pipeline.get_symbol(symbol.upper())
    if not data:
        return jsonify({"error": "symbol not found"}), 404
    return jsonify(data)

@app.route("/api/gainers")
@rate_limit(30, 60)
def get_gainers():
    return jsonify(pipeline.get_gainers(limit=10))

@app.route("/api/losers")
@rate_limit(30, 60)
def get_losers():
    return jsonify(pipeline.get_losers(limit=10))

@app.route("/api/agents")
@rate_limit(30, 60)
def get_agents():
    return jsonify(market_model.get_agent_states())

@app.route("/api/predict/<symbol>")
@rate_limit(20, 60)
def predict(symbol):
    data = pipeline.get_symbol(symbol.upper())
    if not data:
        return jsonify({"error": "no data"}), 404
    prediction = predictor.predict(data)
    return jsonify(prediction)

@app.route("/api/consensus")
@rate_limit(30, 60)
def consensus():
    return jsonify(market_model.get_consensus())

@app.route("/api/signals")
@rate_limit(60, 60)
def signals():
    return jsonify(market_model.get_signals())

@app.route("/api/bot/status")
@rate_limit(60, 60)
def bot_status():
    from bot_engine import BotEngine
    return jsonify(BotEngine.get_status())

@app.route("/api/bot/start", methods=["POST"])
@rate_limit(5, 60)
def bot_start():
    from bot_engine import BotEngine
    config = request.json or {}
    result = BotEngine.start(config)
    return jsonify(result)

@app.route("/api/bot/stop", methods=["POST"])
@rate_limit(5, 60)
def bot_stop():
    from bot_engine import BotEngine
    result = BotEngine.stop()
    return jsonify(result)

@app.route("/api/bot/trades")
@rate_limit(60, 60)
def bot_trades():
    r = db.get_redis()
    raw = r.lrange("bot:trades", 0, 49)
    trades = [json.loads(t) for t in raw]
    return jsonify(trades)

# ── Webhook: external signal trigger ─────────────────────────────────────────
@app.route("/webhook/signal", methods=["POST"])
def webhook_signal():
    payload = request.get_data()
    sig = request.headers.get("X-Signature", "")
    if not verify_hmac(payload, sig):
        return jsonify({"error": "invalid signature"}), 403
    data = json.loads(payload)
    signal = data.get("signal")  # BUY | SELL | CLOSE
    symbol = data.get("symbol", "BTCUSDT")
    qty = float(data.get("qty", 0.001))
    if signal in ("BUY", "SELL"):
        from bot_engine import BotEngine
        result = BotEngine.execute_order(symbol, signal, qty)
        return jsonify(result)
    return jsonify({"error": "unknown signal"}), 400

# ── Socket.IO ─────────────────────────────────────────────────────────────────
@socketio.on("connect")
def on_connect():
    emit("connected", {"ts": datetime.utcnow().isoformat()})

@socketio.on("subscribe")
def on_subscribe(data):
    symbol = data.get("symbol", "BTCUSDT").upper()
    emit("subscribed", {"symbol": symbol})

# ── Background broadcast loop ─────────────────────────────────────────────────
def broadcast_loop():
    while True:
        try:
            latest = pipeline.get_latest()
            socketio.emit("market_update", latest)
            agents = market_model.get_agent_states()
            socketio.emit("agent_update", agents)
        except Exception as e:
            print(f"[broadcast] error: {e}")
        time.sleep(1)

if __name__ == "__main__":
    t = threading.Thread(target=broadcast_loop, daemon=True)
    t.start()
    market_model.start()
    port = int(os.getenv("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
