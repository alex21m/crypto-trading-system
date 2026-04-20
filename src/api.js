import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export const marketAPI = {
  getMarkets: () => api.get('/api/markets'),
  getMarket: (symbol) => api.get(`/api/markets/${symbol}`),
  getGainers: () => api.get('/api/gainers'),
  getLosers: () => api.get('/api/losers'),
  getPrediction: (symbol) => api.get(`/api/predict/${symbol}`),
  getConsensus: () => api.get('/api/consensus'),
  getSignals: () => api.get('/api/signals'),
  getAgents: () => api.get('/api/agents'),
};

export const botAPI = {
  getStatus: () => api.get('/api/bot/status'),
  start: (config) => api.post('/api/bot/start', config),
  stop: () => api.post('/api/bot/stop'),
  getTrades: () => api.get('/api/bot/trades'),
};

export default api;
