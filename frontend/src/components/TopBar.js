import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { C, fmtUSD } from '../styles';

const s = {
  bar: {
    display: 'flex', alignItems: 'center',
    background: C.bg1, borderBottom: `1px solid ${C.bd}`,
    overflow: 'hidden', flexShrink: 0,
  },
  logo: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 22, letterSpacing: 3, color: C.g,
    padding: '0 14px', borderRight: `1px solid ${C.bd}`,
    whiteSpace: 'nowrap', lineHeight: '40px', flexShrink: 0,
  },
  stats: { display: 'flex', flex: 1, overflow: 'hidden' },
  stat: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '0 10px', borderRight: `1px solid ${C.bd}`,
    whiteSpace: 'nowrap', fontSize: 9, flexShrink: 0,
  },
  dot: (connected) => ({
    width: 5, height: 5, borderRadius: '50%',
    background: connected ? C.g : C.r,
    animation: connected ? 'pulse 2s infinite' : 'none',
    flexShrink: 0,
  }),
  modeBadge: (live) => ({
    fontSize: 9, fontWeight: 700, padding: '2px 7px',
    borderRadius: 2, marginLeft: 6, letterSpacing: 1,
    background: live ? C.r2 : C.y2,
    color: live ? C.r : C.y,
    border: `1px solid ${live ? 'rgba(255,59,92,.3)' : 'rgba(245,197,24,.25)'}`,
  }),
  clock: {
    fontSize: 11, color: C.g, padding: '0 12px',
    borderLeft: `1px solid ${C.bd}`, flexShrink: 0, fontWeight: 500,
  },
};

export default function TopBar() {
  const { wsConnected, botStatus, botRunning } = useStore();
  const [clock, setClock] = useState('');
  const isLive = botStatus?.mode === 'live';
  const balance = botStatus?.balance ?? 10000;
  const pnl     = botStatus?.total_pnl ?? 0;
  const winRate = botStatus?.win_rate ?? null;
  const trades  = botStatus?.total_trades ?? 0;
  const aiScore = botStatus ? Math.min(99, Math.max(1, (botStatus.win_rate || 50) + (botStatus.adapt_count || 0) * 3)) : null;

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(d.toUTCString().slice(17, 25) + ' UTC');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      <div style={s.bar}>
        <div style={s.logo}>
          GODVIEW <span style={{ color: C.text2, fontSize: 12, letterSpacing: 1 }}>// TRADING SYSTEM</span>
        </div>
        <div style={s.stats}>
          <div style={s.stat}>
            <div style={s.dot(wsConnected)} />
            <span style={{ color: C.text2 }}>WS</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: wsConnected ? C.g : C.r }}>
              {wsConnected ? 'LIVE' : 'RECONNECT'}
            </span>
          </div>
          <div style={s.stat}>
            <span style={{ color: C.text2 }}>BOT</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: botRunning ? C.g : C.r }}>
              {botRunning ? 'RUNNING' : 'STOPPED'}
            </span>
            <span style={s.modeBadge(isLive)}>{isLive ? 'LIVE' : 'PAPER'}</span>
          </div>
          <div style={s.stat}>
            <span style={{ color: C.text2 }}>BALANCE</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: C.acc }}>
              ${Math.round(balance).toLocaleString()}
            </span>
          </div>
          <div style={s.stat}>
            <span style={{ color: C.text2 }}>PNL</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: pnl >= 0 ? C.g : C.r }}>
              {pnl >= 0 ? '+' : ''}{fmtUSD(pnl)}
            </span>
          </div>
          <div style={s.stat}>
            <span style={{ color: C.text2 }}>WIN%</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: C.b }}>
              {winRate !== null ? winRate + '%' : '—'}
            </span>
          </div>
          <div style={s.stat}>
            <span style={{ color: C.text2 }}>TRADES</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: C.text2 }}>{trades}</span>
          </div>
          <div style={s.stat}>
            <span style={{ color: C.text2 }}>AI SCORE</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: C.p }}>
              {aiScore !== null ? aiScore + '%' : '—'}
            </span>
          </div>
          <div style={s.stat}>
            <span style={{ color: C.text2 }}>OPEN POS</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: C.y }}>
              {botStatus?.open_positions ?? 0}
            </span>
          </div>
        </div>
        <div style={s.clock}>{clock}</div>
      </div>
    </>
  );
}
