import React, { useEffect, useState } from 'react';
import { marketAPI } from '../api';

export default function RightPanel() {
  const [signals, setSignals] = useState([]);
  const [consensus, setConsensus] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sigRes, conRes] = await Promise.all([
          marketAPI.getSignals(),
          marketAPI.getConsensus().catch(() => ({ data: null })),
        ]);
        setSignals(sigRes.data || []);
        setConsensus(conRes.data);
      } catch (e) {
        console.error('[RightPanel] Data error:', e);
      }
    };
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="col" style={{borderLeft: '1px solid #1a2535', borderRight: '1px solid #1a2535', display: 'flex', flexDirection: 'column'}}>
      <div className="ph" style={{fontSize: '10px', background: '#080c12', padding: '4px 9px', color: '#3d5570'}}>AI SIGNALS</div>
      <div className="scr" style={{overflowY: 'auto', flex: 1}}>
        {signals.length === 0 ? <div style={{padding: '10px', fontSize: '10px', color: '#3d5570'}}>Scanning for signals...</div> : 
          signals.map((sig, i) => (
          <div key={i} style={{padding: '10px', borderBottom: '1px solid #1a2535'}}>
            <div style={{
              display: 'inline-block', 
              padding: '2px 6px', 
              borderRadius: '2px', 
              fontSize: '9px', 
              fontWeight: 700,
              background: sig.action === 'BUY' ? 'rgba(0, 232, 122, 0.2)' : 'rgba(255, 59, 92, 0.2)',
              color: sig.action === 'BUY' ? '#00e87a' : '#ff3b5c',
              marginBottom: '5px'
            }}>
              {sig.action}
            </div>
            <div style={{fontWeight: 700, fontSize: '12px'}}>{sig.pair}</div>
            <div style={{fontSize: '10px', color: '#7a94ab', margin: '4px 0'}}>{sig.reason}</div>
            <div style={{fontSize: '9px', color: '#3d5570'}}>Confidence: {sig.confidence}%</div>
          </div>
        ))}
      </div>
      <div className="ph" style={{fontSize: '10px', background: '#080c12', padding: '4px 9px', color: '#3d5570'}}>CONSENSUS ENGINE</div>
      <div style={{padding: '15px'}}>
        {consensus ? (
          <div style={{background: '#0e141e', padding: '10px', border: '1px solid #1a2535'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px'}}>
              <span style={{color: '#00e87a'}}>BULL: {consensus.bull_pct}%</span>
              <span style={{color: '#ff3b5c'}}>BEAR: {consensus.bear_pct}%</span>
            </div>
            <div style={{fontSize: '10px', color: '#7a94ab'}}>Direction: {consensus.direction}</div>
          </div>
        ) : <div style={{fontSize: '10px', color: '#3d5570'}}>Analyzing consensus...</div>}
      </div>
    </div>
  );
}
