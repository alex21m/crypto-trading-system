import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || '';

const api = axios.create({ baseURL: BASE, timeout: 10000 });

export const getMarkets    = () => api.get('/api/markets').then(r => r.data);
export const getGainers    = () => api.get('/api/gainers').then(r => r.data);
export const getLosers     = () => api.get('/api/losers').then(r => r.data);
export const getSignals    = () => api.get('/api/signals').then(r => r.data);
export const getConsensus  = () => api.get('/api/consensus').then(r => r.data);
export const getAgents     = () => api.get('/api/agents').then(r => r.data);
export const getPredict    = (sym) => api.get(`/api/predict/${sym}`).then(r => r.data);
export const getBotStatus  = () => api.get('/api/bot/status').then(r => r.data);
export const getBotTrades  = () => api.get('/api/bot/trades').then(r => r.data);
export const startBot      = (cfg) => api.post('/api/bot/start', cfg).then(r => r.data);
export const stopBot       = () => api.post('/api/bot/stop').then(r => r.data);
