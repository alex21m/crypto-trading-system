import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { marketAPI } from '../api';

export default function LeftPanel() {
  const markets = useStore((s) => s.markets);
  const selectedPair = useStore((s) => s.selectedPair);
  const [gainers, setGainers] = useState([]);

  useEffect(() => {
    const loadGainers = async () => {
      try {
        const res = await marketAPI.getGainers();
        setGainers(res.data);
      } catch (e) {
        console.error('[LeftPanel] Gainers error:', e);
      }
    };
    loadGainers();
    const interval = setInterval(loadGainers, 10000);
    return () => clearInterval(interval);
  }, []);

  const pairs = Object.values(markets).slice(0, 8);

  return (
    <div className="col" style={{borderRight: '1px solid #1a2535', display: 'flex', flexDirection: 'column'}}>
      <div className="ph" style={{fontSize: '10px', background: '#080c12', padding: '4px 9px', color: '#3d5570'}}>TOP PAIRS · LIVE</div>
      <div className="scr" style={{overflowY: 'auto', flex: 1}}>
        {pairs.map((pair) => (
          <div key={pair.symbol} style={{
            padding: '8px 10px', 
            borderBottom: '1px solid #1a2535', 
            background: selectedPair === pair.symbol ? '#0e141e' : '',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{fontWeight: 700, fontSize: '11px'}}>{pair.symbol}</div>
              <div style={{fontSize: '9px', color: '#3d5570'}}>24H</div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{color: pair.change_pct >= 0 ? '#00e87a' : '#ff3b5c', fontWeight: 700}}>{pair.price.toFixed(2)}</div>
              <div style={{color: pair.change_pct >= 0 ? '#00e87a' : '#ff3b5c', fontSize: '10px'}}>
                {pair.change_pct >= 0 ? '+' : ''}{pair.change_pct.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
