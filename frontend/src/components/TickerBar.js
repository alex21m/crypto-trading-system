import React from 'react';
import { useStore } from '../store';
import { C, fmtPrice, fmtChg, colorForChg } from '../styles';

const TOP10 = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','DOTUSDT'];

export default function TickerBar() {
  const { markets } = useStore();

  const items = TOP10.map(sym => {
    const d = markets[sym] || {};
    const chg = parseFloat(d.change_pct ?? 0);
    const col = colorForChg(chg);
    return (
      <div key={sym} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 14px', fontSize: 10, borderRight: `1px solid ${C.bd}` }}>
        <span style={{ color: C.text2 }}>{sym.replace('USDT', '')}/USDT</span>
        <span style={{ color: col }}>{fmtPrice(d.price)}</span>
        <span style={{ color: col, fontSize: 9 }}>{fmtChg(chg)}</span>
      </div>
    );
  });

  return (
    <div style={{ background: C.bg1, borderTop: `1px solid ${C.bd}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', overflow: 'hidden', height: 22, flexShrink: 0 }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: C.bg, background: C.g, padding: '1px 5px', borderRadius: 1, flexShrink: 0, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>LIVE</div>
      <div style={{ overflow: 'hidden', flex: 1, height: '100%', display: 'flex', alignItems: 'center' }}>
        <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
        <div style={{ whiteSpace: 'nowrap', display: 'inline-flex', animation: 'ticker 60s linear infinite' }}>
          {items}{items}
        </div>
      </div>
    </div>
  );
}
