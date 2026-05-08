import React, { useState } from 'react';
import { useStore } from '../store';
import { C, fmtPrice, fmtChg, fmtVol, colorForChg, ph, scrollCol } from '../styles';

const TOP20 = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT',
  'DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','DOTUSDT',
  'LTCUSDT','MATICUSDT','NEARUSDT','ATOMUSDT','UNIUSDT',
  'AAVEUSDT','INJUSDT','SUIUSDT','ARBUSDT','OPUSDT',
];

const HEAT16 = ['BTC','ETH','SOL','XRP','BNB','SUI','ARB','UNI','AVAX','DOGE','ADA','LINK','DOT','OP','INJ','NEAR'];

function PairRow({ sym, data, active, onClick }) {
  const chg = parseFloat(data?.change_pct ?? 0);
  const col = colorForChg(chg);
  return (
    <div onClick={onClick} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '4px 8px', borderBottom: `1px solid ${C.bd}`, cursor: 'pointer',
      background: active ? C.g2 : 'transparent',
      borderLeft: active ? `2px solid ${C.g}` : '2px solid transparent',
      transition: 'background .1s',
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 500, color: col }}>
          {sym.replace('USDT', '')}<span style={{ color: C.text3, fontSize: 9 }}>/USDT</span>
        </div>
        <div style={{ fontSize: 9, color: C.text3 }}>{fmtVol(data?.volume)}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: col }}>{fmtPrice(data?.price)}</div>
        <div style={{
          fontSize: 9, padding: '1px 4px', borderRadius: 2, marginTop: 1,
          background: chg >= 0 ? C.g2 : C.r2, color: col,
        }}>{fmtChg(chg)}</div>
      </div>
    </div>
  );
}

function Heatmap({ markets }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, padding: 3 }}>
      {HEAT16.map(sym => {
        const pair = sym + 'USDT';
        const chg = parseFloat(markets[pair]?.change_pct ?? 0);
        const iv = Math.min(Math.abs(chg), 10) / 10;
        const bg = chg >= 0
          ? `rgba(0,232,122,${0.07 + iv * 0.5})`
          : `rgba(255,59,92,${0.07 + iv * 0.5})`;
        return (
          <div key={sym} style={{
            aspectRatio: '1.3', borderRadius: 2, background: bg,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <span style={{ fontSize: 8, fontWeight: 600, color: colorForChg(chg) }}>{sym}</span>
            <span style={{ fontSize: 7, color: colorForChg(chg) }}>{fmtChg(chg)}</span>
          </div>
        );
      })}
    </div>
  );
}

function VolBars({ markets }) {
  const sorted = TOP20
    .map(p => ({ sym: p.replace('USDT', ''), pair: p, vol: parseFloat(markets[p]?.volume ?? 0), chg: parseFloat(markets[p]?.change_pct ?? 0) }))
    .sort((a, b) => b.vol - a.vol)
    .slice(0, 10);
  const maxVol = Math.max(...sorted.map(x => x.vol), 1);
  return (
    <div>
      {sorted.map(({ sym, vol, chg }) => {
        const pct = (vol / maxVol * 100).toFixed(0);
        const col = colorForChg(chg);
        return (
          <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderBottom: `1px solid ${C.bd}` }}>
            <span style={{ fontSize: 9, color: C.text2, width: 32, flexShrink: 0 }}>{sym}</span>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.05)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: pct + '%', background: col, borderRadius: 2, transition: 'width .8s' }} />
            </div>
            <span style={{ fontSize: 9, color: col, width: 38, textAlign: 'right', flexShrink: 0 }}>{fmtChg(chg)}</span>
          </div>
        );
      })}
    </div>
  );
}

function MktStats() {
  const stats = [
    { l: 'BTC Dominance',   v: (50 + Math.random() * 7).toFixed(1) + '%', c: C.y },
    { l: 'Open Interest',   v: '$' + (20 + Math.random() * 15).toFixed(1) + 'B', c: C.g },
    { l: 'Liquidations 24h', v: '$' + Math.round(200 + Math.random() * 600) + 'M', c: C.r },
    { l: 'L/S Ratio',       v: (0.8 + Math.random() * 0.6).toFixed(2), c: C.text },
    { l: 'BTC Funding',     v: (Math.random() * 0.15 - 0.03).toFixed(4) + '%', c: C.b },
    { l: 'Fear & Greed',    v: Math.round(35 + Math.random() * 43) + '/100', c: C.p },
  ];
  return (
    <div>
      {stats.map(({ l, v, c }) => (
        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '3px 8px', borderBottom: `1px solid ${C.bd}` }}>
          <span style={{ color: C.text2 }}>{l}</span>
          <span style={{ color: c }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

export default function LeftCol() {
  const { markets, selectedPair, setSelectedPair, gainers } = useStore();
  const [view, setView] = useState('all'); // all | gainers | losers

  const sorted = view === 'gainers'
    ? [...TOP20].sort((a, b) => parseFloat(markets[b]?.change_pct ?? 0) - parseFloat(markets[a]?.change_pct ?? 0))
    : view === 'losers'
    ? [...TOP20].sort((a, b) => parseFloat(markets[a]?.change_pct ?? 0) - parseFloat(markets[b]?.change_pct ?? 0))
    : TOP20;

  const btnStyle = (active) => ({
    background: active ? C.g2 : C.bg3, color: active ? C.g : C.text2,
    border: `1px solid ${active ? 'rgba(0,232,122,.25)' : C.bd}`,
    borderRadius: 2, fontSize: 9, padding: '2px 7px', cursor: 'pointer',
    fontFamily: "'IBM Plex Mono', monospace",
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: `1px solid ${C.bd}` }}>
      <div style={ph}>TOP 20 PAIRS · LIVE</div>
      <div style={{ padding: '4px 8px', display: 'flex', gap: 4, background: C.bg1, borderBottom: `1px solid ${C.bd}`, flexShrink: 0 }}>
        {['all', 'gainers', 'losers'].map(v => (
          <button key={v} style={btnStyle(view === v)} onClick={() => setView(v)}>
            {v.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={scrollCol}>
        {sorted.map(sym => (
          <PairRow
            key={sym} sym={sym}
            data={markets[sym]}
            active={sym === selectedPair}
            onClick={() => setSelectedPair(sym)}
          />
        ))}
        <div style={ph}>HEATMAP · 16 ASSETS</div>
        <Heatmap markets={markets} />
        <div style={ph}>VOLATILITY RANK</div>
        <VolBars markets={markets} />
        <div style={ph}>MARKET STATS</div>
        <MktStats />
      </div>
    </div>
  );
}
