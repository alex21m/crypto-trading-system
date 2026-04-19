import { useEffect } from 'react';
import { useStore } from '../store';
import * as api from '../api';

export function useDataPolling(intervalMs = 5000) {
  const {
    setMarkets, setGainers, setLosers,
    setSignals, setConsensus, setAgents,
    setBotStatus, setBotTrades,
  } = useStore();

  const fetchAll = async () => {
    try {
      const [markets, gainers, losers, signals, consensus, agents, botStatus, botTrades] =
        await Promise.allSettled([
          api.getMarkets(),
          api.getGainers(),
          api.getLosers(),
          api.getSignals(),
          api.getConsensus(),
          api.getAgents(),
          api.getBotStatus(),
          api.getBotTrades(),
        ]);

      if (markets.status === 'fulfilled')   setMarkets(markets.value);
      if (gainers.status === 'fulfilled')   setGainers(gainers.value);
      if (losers.status === 'fulfilled')    setLosers(losers.value);
      if (signals.status === 'fulfilled')   setSignals(signals.value);
      if (consensus.status === 'fulfilled') setConsensus(consensus.value);
      if (agents.status === 'fulfilled')    setAgents(agents.value);
      if (botStatus.status === 'fulfilled') setBotStatus(botStatus.value);
      if (botTrades.status === 'fulfilled') setBotTrades(botTrades.value);
    } catch (e) {
      console.error('[polling] error:', e);
    }
  };

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, intervalMs);
    return () => clearInterval(id);
  }, []);
}
