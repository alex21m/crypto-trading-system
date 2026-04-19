# GODVIEW — Crypto Trading System

Real-time automated crypto trading terminal. Binance Futures live data, AI signal engine, multi-agent simulation, full Docker + Vercel deployment.

---

## Architecture

```
crypto-trading-system/
├── backend/                  Flask API + Socket.IO + Bot Engine
│   ├── app.py                REST endpoints + WebSocket broadcast
│   ├── bot_engine.py         Trading logic + Binance Futures order execution
│   ├── data_pipeline.py      Binance WS + REST feeds → Redis cache
│   ├── db.py                 Redis + TimescaleDB connections
│   ├── agents/simulation.py  Multi-agent market simulation (Mesa patterns)
│   ├── models/predictor.py   MiroFish AI — TA-based signal predictor
│   └── Dockerfile
├── frontend/                 React dashboard (GodView terminal UI)
│   ├── src/
│   │   ├── App.js            Root layout
│   │   ├── store.js          Zustand global state
│   │   ├── api.js            Axios API client
│   │   ├── hooks/            useSocket, useDataPolling
│   │   └── components/       TopBar, LeftCol, CenterCol, RightCol, ConfigCol
│   ├── vercel.json           Vercel deployment config
│   └── Dockerfile
├── nginx/nginx.conf          Reverse proxy: React + /api/ + /socket.io/
├── docker-compose.yml        Full stack: backend + frontend + Redis + TimescaleDB
└── .github/workflows/        CI/CD: test → build → push → deploy
```

---

## Quick Start (Docker)

### 1. Clone

```bash
git clone https://github.com/YOUR_ORG/crypto-trading-system.git
cd crypto-trading-system
```

### 2. Configure

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your Binance API keys
```

Key variables:
```env
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
BINANCE_TESTNET=true        # Use testnet first!
PAPER_TRADING=true          # Paper mode by default
SECRET_KEY=random_64_char_string
DB_PASSWORD=your_db_password
```

### 3. Launch

```bash
docker compose up --build -d
```

| Service    | URL                        |
|------------|----------------------------|
| Dashboard  | http://localhost:3000      |
| Backend API| http://localhost:5000      |
| TimescaleDB| localhost:5432             |
| Redis      | localhost:6379             |

### 4. Stop

```bash
docker compose down
```

---

## Vercel Deployment (Frontend)

```bash
cd frontend
npm install -g vercel
vercel login
vercel deploy --prod
```

Set Vercel env variables:
```
REACT_APP_API_URL=https://your-backend.example.com
REACT_APP_SOCKET_URL=https://your-backend.example.com
```

Update `vercel.json` rewrites to point to your backend URL.

---

## AWS EC2 Deployment

```bash
# On EC2 instance (Ubuntu 22.04)
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
git clone https://github.com/YOUR_ORG/crypto-trading-system.git
cd crypto-trading-system
cp backend/.env.example backend/.env
# Edit .env
docker compose up -d
```

Set up GitHub Actions secrets for auto-deploy:
- `DEPLOY_HOST` — EC2 public IP
- `DEPLOY_USER` — ubuntu
- `DEPLOY_SSH_KEY` — EC2 private key

---

## REST API Reference

### Market Data
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | `/api/markets`        | All 20 pairs live data   |
| GET    | `/api/markets/:symbol`| Single pair data         |
| GET    | `/api/gainers`        | Top 10 gainers (24h)     |
| GET    | `/api/losers`         | Top 10 losers (24h)      |
| GET    | `/api/predict/:symbol`| AI price prediction      |

### Bot Control
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | `/api/bot/status`     | Bot state + stats        |
| POST   | `/api/bot/start`      | Start bot with config    |
| POST   | `/api/bot/stop`       | Stop bot                 |
| GET    | `/api/bot/trades`     | Last 50 trades           |

### Bot Start Payload
```json
{
  "strategy": "ai",
  "leverage": 10,
  "position_size_pct": 5,
  "stop_loss_pct": 1.5,
  "take_profit_pct": 3.0,
  "max_open_positions": 3,
  "max_daily_loss_pct": 3,
  "min_confidence": 70,
  "mode": "paper"
}
```

### Webhook (external signal trigger)
```bash
# Compute HMAC-SHA256 signature
SIG=$(echo -n '{"signal":"BUY","symbol":"BTCUSDT","qty":0.001}' | openssl dgst -sha256 -hmac "$SECRET_KEY" | cut -d' ' -f2)

curl -X POST http://localhost:5000/webhook/signal \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIG" \
  -d '{"signal":"BUY","symbol":"BTCUSDT","qty":0.001}'
```

### Socket.IO Events
| Event           | Direction      | Payload                      |
|-----------------|----------------|------------------------------|
| `market_update` | server→client  | All market tickers dict      |
| `agent_update`  | server→client  | Agent states array           |
| `subscribe`     | client→server  | `{ "symbol": "BTCUSDT" }`    |

---

## Binance API Setup

1. Go to [Binance API Management](https://www.binance.com/en/my/settings/api-management)
2. Create new API key
3. Enable: **Futures Trading** + **Read**
4. Restrict to your server IP
5. For testnet: [testnet.binancefuture.com](https://testnet.binancefuture.com)
6. Set in `backend/.env`

> **Warning:** Start with `PAPER_TRADING=true` and `BINANCE_TESTNET=true`. Only switch to live after verifying strategy performance.

---

## Strategies

| Strategy      | Logic                                     | Best For       |
|---------------|-------------------------------------------|----------------|
| `ai`          | Multi-indicator ensemble, auto-adapts     | General        |
| `trend`       | EMA cross + momentum bias                 | Trending mkt   |
| `scalp`       | High-frequency small gains                | Volatile mkt   |
| `mean`        | RSI extremes reversion                    | Range-bound    |
| `macd`        | MACD line crossover                       | Momentum       |
| `bb`          | Bollinger band breakout                   | Breakouts      |
| `whale`       | Follows whale agent accumulation signal   | Trend confirm  |

AI Adaptive auto-switches strategy if win rate drops below 40%.

---

## Security

- API keys stored in environment variables, never in code
- HMAC-SHA256 webhook signature validation
- Redis rate limiting per IP
- CORS configured for known origins
- Non-root Docker user
- IP restriction on Binance API keys (recommended)

---

## Development

```bash
# Backend dev
cd backend
pip install -r requirements.txt
cp .env.example .env
python app.py

# Frontend dev
cd frontend
npm install --legacy-peer-deps
npm start          # → http://localhost:3000 (proxies to :5000)
```

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|--------------------------------------------------|
| Backend     | Python 3.11, Flask, Flask-SocketIO, Gunicorn    |
| Data Feed   | Binance WebSocket + REST (fapi.binance.com)     |
| AI Engine   | scikit-learn, TA indicators, ensemble scoring   |
| Agents      | Custom Mesa-pattern multi-agent simulation      |
| Cache       | Redis 7                                         |
| Database    | TimescaleDB (PostgreSQL + time-series)          |
| Frontend    | React 18, Zustand, Chart.js, Socket.IO client   |
| Proxy       | Nginx                                           |
| Containers  | Docker + Docker Compose                         |
| CI/CD       | GitHub Actions → GHCR → SSH deploy             |
| Frontend CD | Vercel                                          |

---

## License

MIT — use at own risk. Crypto trading involves significant financial risk.
# crypto-trading-system
