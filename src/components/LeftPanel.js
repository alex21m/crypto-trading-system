import React, { useEffect, useState } from 'react';
import { useStore } from '../store';

export default function LeftPanel() {
  const selectedPair = useStore((s) => s.selectedPair);
  const setSelectedPair = useStore((s) => s.setSelectedPair);
  const [prices, setPrices] = useState({});

  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'XRPUSDT'];

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('https://crypto-trading-system-ten.vercel.app/api/binance/ticker');
        const data = await res.json();
        // Convert array to map for easy 24h lookup
        const priceMap = {};
        data.forEach(item => {
          if (symbols.includes(item.symbol)) {
            priceMap[item.symbol] = {
              price: parseFloat(item.lastPrice),
              change: parseFloat(item.priceChangePercent)
            };
          }
        });
        setPrices(priceMap);
      } catch (e) {
        console.error('[LeftPanel] Price poll error:', e);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="col" style={{borderRight: '1px solid #1a2535', display: 'flex', flexDirection: 'column'}}>
      <div className="ph" style={{fontSize: '10px', background: '#080c12', padding: '4px 9px', color: '#3d5570'}}>TOP PAIRS · LIVE</div>
      <div className="scr" style={{overflowY: 'auto', flex: 1}}>
        {symbols.map((sym) => {
          const p = prices[sym] || { price: 0, change: 0 };
          return (
            <div 
              key={sym} 
              onClick={() => setSelectedPair(sym)}
              style={{
                padding: '8px 10px', 
                borderBottom: '1px solid #1a2535', 
                background: selectedPair === sym ? '#0e141e' : '',
                display: 'flex',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <div>
                <div style={{fontWeight: 700, fontSize: '11px'}}>{sym}</div>
                <div style={{fontSize: '9px', color: '#3d5570'}}>24H</div>
              </div>
              <div style={{textAlign: 'right'}}>
                <div style={{color: p.change >= 0 ? '#00e87a' : '#ff3b5c', fontWeight: 700}}>{p.price.toFixed(2)}</div>
                <div style={{color: p.change >= 0 ? '#00e87a' : '#ff3b5c', fontSize: '10px'}}>
                  {p.change >= 0 ? '+' : ''}{p.change.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
