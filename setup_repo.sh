#!/usr/bin/env bash
# setup_repo.sh — Initialize git repo and push to GitHub
# Usage: bash setup_repo.sh YOUR_GITHUB_USERNAME

set -e

REPO_NAME="crypto-trading-system"
GITHUB_USER="${1:-YOUR_GITHUB_USERNAME}"

echo "=== Initializing git repository ==="
git init
git add .
git commit -m "feat: initial commit — GODVIEW Crypto Trading System v3

- Real-time Binance Futures WebSocket feed (top 20 pairs)
- Flask backend with Socket.IO live broadcast
- Bot engine: paper + live trading with HMAC-signed Binance orders
- AI Adaptive strategy engine (7 strategies, auto-switches)
- Multi-agent market simulation
- MiroFish AI predictor (TA indicators + ensemble scoring)
- React/GodView terminal dashboard
- TimescaleDB + Redis persistence layer
- Docker Compose full-stack deployment
- Vercel frontend deployment config
- GitHub Actions CI/CD pipeline"

echo ""
echo "=== Creating GitHub repository ==="
echo "Run these commands after creating the repo at https://github.com/new:"
echo ""
echo "  git remote add origin https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
echo "  git branch -M main"
echo "  git push -u origin main"
echo ""
echo "=== OR use GitHub CLI ==="
echo "  gh repo create ${REPO_NAME} --public --source=. --remote=origin --push"
echo ""
echo "=== After push, set these GitHub Secrets for CI/CD ==="
echo "  DEPLOY_HOST      — your server IP"
echo "  DEPLOY_USER      — ssh username (e.g. ubuntu)"
echo "  DEPLOY_SSH_KEY   — private key for SSH"
echo ""
echo "Done! Repo initialized locally."
