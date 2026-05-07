import { create } from 'zustand';

export const useStore = create((set) => ({
  markets: {},
  agents: [],
  botStatus: null,
  selectedPair: 'BTCUSDT',
  signals: [],
  consensus: null,

  setMarkets: (markets) => set({ markets }),
  setAgents: (agents) => set({ agents }),
  setBotStatus: (status) => set({ botStatus: status }),
  setSelectedPair: (pair) => set({ selectedPair: pair }),
  setSignals: (signals) => set({ signals }),
  setConsensus: (consensus) => set({ consensus }),
}));
