import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Market
  markets: {},
  selectedPair: 'BTCUSDT',
  gainers: [],
  losers: [],
  signals: [],
  consensus: null,
  agents: [],

  // Bot
  botStatus: null,
  botTrades: [],
  botRunning: false,

  // Config
  config: {
    mode: 'paper',
    strategy: 'ai',
    leverage: 10,
    position_size_pct: 5,
    stop_loss_pct: 1.5,
    take_profit_pct: 3.0,
    max_open_positions: 3,
    max_daily_loss_pct: 3,
    min_confidence: 70,
    pairs: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
    apiKey: '',
    apiSecret: '',
  },

  // UI
  activeTab: 'candle',
  wsConnected: false,

  // Actions
  setMarkets: (markets) => set({ markets }),
  setSelectedPair: (pair) => set({ selectedPair: pair }),
  setGainers: (gainers) => set({ gainers }),
  setLosers: (losers) => set({ losers }),
  setSignals: (signals) => set({ signals }),
  setConsensus: (consensus) => set({ consensus }),
  setAgents: (agents) => set({ agents }),
  setBotStatus: (botStatus) => set({ botStatus, botRunning: botStatus?.running || false }),
  setBotTrades: (botTrades) => set({ botTrades }),
  setConfig: (partial) => set((s) => ({ config: { ...s.config, ...partial } })),
  setActiveTab: (activeTab) => set({ activeTab }),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  updateMarketTick: (tick) => set((s) => ({
    markets: { ...s.markets, [tick.symbol]: tick }
  })),
}));
