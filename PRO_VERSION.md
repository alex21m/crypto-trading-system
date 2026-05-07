# GODVIEW Pro — Auto Trading System Documentation

## Repository Analysis
The GODVIEW system is a comprehensive, real-time cryptocurrency trading terminal and automated bot. It is designed for high-performance data ingestion, multi-agent market simulation, and AI-driven trade execution.

### Key Components
1.  **Backend (Python/Flask)**: The core engine handling data pipelines, bot logic, and AI predictions.
2.  **Frontend (React)**: A real-time dashboard for monitoring markets, bot performance, and agent simulations.
3.  **Data Pipeline**: Dual-stream ingestion via Binance WebSocket for real-time ticks and REST polling for 24h statistics.
4.  **Bot Engine**: Multi-strategy execution (AI, Trend, Mean Reversion, MACD, Bollinger Bands, Whale-Following) with paper and live trading modes.
5.  **AI Engine**: A feature-rich predictor using technical indicators (EMA, MACD, RSI, ATR) to generate high-confidence signals.
6.  **Simulation Layer**: A Mesa-based multi-agent system that simulates market participant behavior (Whales, Scalpers, Retail).

---

## Pro Version Features
The "Pro" version introduces several enhancements over the base system:
-   **Advanced AI Indicators**: Integrated long-term trend analysis (EMA 200) and volatility-adjusted signals (ATR).
-   **New Trading Strategies**:
    -   **Bollinger Band Breakout**: Executes mean-reversion trades when price deviates significantly from the moving average.
    -   **Whale-Following**: Synchronizes bot activity with large-scale "Whale" agent movements identified in the simulation.
-   **Singleton Architecture**: Ensures efficient resource management for data streams and simulation engines.
-   **Production-Ready Structure**: Clean separation of concerns with a dedicated `frontend/` directory and optimized Nginx configuration.

---

## Architecture Summary
The system follows a containerized microservices architecture:
-   **Reverse Proxy (Nginx)**: Routes traffic to the frontend and provides a secure gateway to the API/WebSockets.
-   **Application Server (Gunicorn/Flask)**: Handles business logic and real-time broadcasts via Socket.IO.
-   **Caching Layer (Redis)**: Stores latest market ticks and handles rate limiting.
-   **Persistence Layer (TimescaleDB)**: Optimized PostgreSQL for time-series trade history and market data.

---

## Full Build & Setup Guide

### 1. Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### 2. Configuration
Copy `backend/.env.example` to `backend/.env` and fill in your Binance API keys.
```env
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
BINANCE_TESTNET=true
PAPER_TRADING=true
```

### 3. Deployment with Docker Compose
From the root directory, run:
```bash
docker compose up --build -d
```
This will:
-   Build the React frontend and serve it via Nginx on port 3000.
-   Build the Flask backend and expose it on port 5001.
-   Initialize Redis and TimescaleDB containers.

### 4. Local Development
**Backend**:
```bash
cd backend
pip install -r requirements.txt
python app.py
```

**Frontend**:
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

### 5. Accessing the System
-   **GodView Terminal**: `http://localhost:3000`
-   **API Health Check**: `http://localhost:5001/health`
