import axios from 'axios';

// When deployed on Vercel, API routes live on the same origin.
// Locally, proxy via REACT_APP_API_URL (e.g. http://localhost:5001).
const BASE = process.env.REACT_APP_API_URL || '';

const api = axios.create({ baseURL: BASE, timeout: 12000 });

// ── Public market data (via Vercel serverless proxy) ─────────────────────────
export const getTickers     = () => api.get('/api/binance/ticker').then(r => r.data);
export const getKlines      = (sym, interval = '5m', limit = 100) =>
  api.get('/api/binance/klines', { params: { symbol: sym, interval, limit } }).then(r => r.data);
export const getDepth       = (sym, limit = 20) =>
  api.get('/api/binance/depth', { params: { symbol: sym, limit } }).then(r => r.data);
export const getFunding     = (sym) =>
  api.get('/api/binance/funding', { params: { symbol: sym } }).then(r => r.data);

// ── Signed endpoints (HMAC signing happens on server, never in browser) ──────
export const getAccount     = () => api.get('/api/binance/account').then(r => r.data);
export const getPositions   = () => api.get('/api/binance/positions').then(r => r.data);
export const placeOrder     = (params) => api.post('/api/binance/order', params).then(r => r.data);
export const setLeverage    = (symbol, leverage) =>
  api.post('/api/binance/leverage', { symbol, leverage }).then(r => r.data);

// ── Local backend endpoints (Flask via Docker / ngrok) ───────────────────────
const backend = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || BASE,
  timeout: 10000,
});

export const getMarkets    = () => backend.get('/api/markets').then(r => r.data);
export const getGainers    = () => backend.get('/api/gainers').then(r => r.data);
export const getLosers     = () => backend.get('/api/losers').then(r => r.data);
export const getSignals    = () => backend.get('/api/signals').then(r => r.data);
export const getConsensus  = () => backend.get('/api/consensus').then(r => r.data);
export const getAgents     = () => backend.get('/api/agents').then(r => r.data);
export const getPredict    = (sym) => backend.get(`/api/predict/${sym}`).then(r => r.data);
export const getBotStatus  = () => backend.get('/api/bot/status').then(r => r.data);
export const getBotTrades  = () => backend.get('/api/bot/trades').then(r => r.data);
export const startBot      = (cfg) => backend.post('/api/bot/start', cfg).then(r => r.data);
export const stopBot       = () => backend.post('/api/bot/stop').then(r => r.data);
