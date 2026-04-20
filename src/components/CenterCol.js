import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { C, fmtPrice, fmtChg, fmtUSD, colorForChg, ph } from '../styles';
import { startBot, stopBot } from '../api';
import toast from 'react-hot-toast';

// ── Candle chart (native canvas) ──────────────────────────────────────────────
function CandleChart({ symbol, price }) {
  const canvasRef = useRef(null);
  const candlesRef = useRef([]);

  useEffect(() => {
    // Seed 80 synthetic candles
    const base = price || 67000;
    const now = Date.now();
    const seed = [];
    let p = base;
    for (let i = 80; i >= 0; i--) {
      const o = p * (1 + (Math.random() - 0.499) * 0.008);
      const c = o * (1 + (Math.random() - 0.499) * 0.012);
      seed.push({ t: new Date(now - i * 60000), o, h: Math.max(o, c) * (1 + Math.random() * 0.005), l: Math.min(o, c) * (1 - Math.random() * 0.005), c, v: Math.random() * 8 + 0.5 });
      p = c;
    }
    candlesRef.current = seed;
  }, [symbol]);

  useEffect(() => {
    if (!price || !candlesRef.current.length) return;
    const last = candlesRef.current[candlesRef.current.length - 1];
    last.c = price;
    last.h = Math.max(last.h, price);
    last.l = Math.min(last.l, price);
    draw();
  }, [price]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrap = canvas.parentElement;
    canvas.width = wrap.offsetWidth;
    canvas.height = wrap.offsetHeight;
    if (!canvas.width || !canvas.height) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const PAD = { t: 12, r: 68, b: 28, l: 8 };
    const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const vis = candlesRef.current.slice(-80);
    const minL = Math.min(...vis.map(c => c.l));
    const maxH = Math.max(...vis.map(c => c.h));
    const range = maxH - minL || 1;
    const yS = v => PAD.t + cH * (1 - (v - minL) / range);
    const barW = Math.max(2, Math.floor(cW / vis.length) - 1);

    // grid
    ctx.strokeStyle = 'rgba(26,37,53,.7)'; ctx.lineWidth = .5;
    for (let i = 0; i <= 5; i++) {
      const y = PAD.t + cH * (i / 5);
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
      const pv = maxH - range * (i / 5);
      ctx.fillStyle = 'rgba(122,148,171,.5)'; ctx.font = '9px IBM Plex Mono'; ctx.textAlign = 'left';
      ctx.fillText('$' + pv.toLocaleString(undefined, { maximumFractionDigits: pv >= 100 ? 1 : 4 }), W - PAD.r + 4, y + 3);
    }
    // MA20
    if (vis.length >= 20) {
      ctx.beginPath(); ctx.strokeStyle = 'rgba(45,156,255,.6)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      vis.forEach((c, i) => {
        if (i < 19) return;
        const ma = vis.slice(i - 19, i + 1).reduce((a, b) => a + b.c, 0) / 20;
        const x = PAD.l + i * (cW / vis.length) + barW / 2;
        i === 19 ? ctx.moveTo(x, yS(ma)) : ctx.lineTo(x, yS(ma));
      });
      ctx.stroke(); ctx.setLineDash([]);
    }
    // MA50
    if (vis.length >= 50) {
      ctx.beginPath(); ctx.strokeStyle = 'rgba(240,185,11,.4)'; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
      vis.forEach((c, i) => {
        if (i < 49) return;
        const ma = vis.slice(i - 49, i + 1).reduce((a, b) => a + b.c, 0) / 50;
        const x = PAD.l + i * (cW / vis.length) + barW / 2;
        i === 49 ? ctx.moveTo(x, yS(ma)) : ctx.lineTo(x, yS(ma));
      });
      ctx.stroke(); ctx.setLineDash([]);
    }
    // Candles
    vis.forEach((c, i) => {
      const x = PAD.l + i * (cW / vis.length), cx = x + barW / 2;
      const isUp = c.c >= c.o, col = isUp ? C.g : C.r;
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, yS(c.h)); ctx.lineTo(cx, yS(c.l)); ctx.stroke();
      const bT = Math.min(yS(c.o), yS(c.c));
      const bH = Math.max(1, Math.abs(yS(c.o) - yS(c.c)));
      ctx.fillStyle = isUp ? col : 'rgba(255,59,92,.15)';
      ctx.fillRect(x, bT, barW, bH); ctx.lineWidth = .8; ctx.strokeRect(x, bT, barW, bH);
    });
    // Time labels
    ctx.fillStyle = 'rgba(122,148,171,.4)'; ctx.font = '9px IBM Plex Mono'; ctx.textAlign = 'center';
    const step = Math.floor(vis.length / 8);
    vis.forEach((c, i) => {
      if (i % step === 0) { const x = PAD.l + i * (cW / vis.length) + barW / 2; ctx.fillText(c.t.toTimeString().slice(0, 5), x, H - 5); }
    });
    // Price line
    const last = vis[vis.length - 1];
    const ly = yS(last.c);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(0,232,122,.5)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(PAD.l, ly); ctx.lineTo(W - PAD.r, ly); ctx.stroke(); ctx.setLineDash([]);
    const lt = '$' + last.c.toLocaleString(undefined, { maximumFractionDigits: last.c >= 100 ? 2 : 4 });
    ctx.font = 'bold 10px IBM Plex Mono'; ctx.textAlign = 'left';
    const lw = ctx.measureText(lt).width;
    ctx.fillStyle = last.c >= last.o ? 'rgba(0,232,122,.18)' : 'rgba(255,59,92,.18)';
    ctx.fillRect(W - PAD.r + 2, ly - 8, lw + 8, 14);
    ctx.fillStyle = last.c >= last.o ? C.g : C.r;
    ctx.fillText(lt, W - PAD.r + 5, ly + 3);
  };

  useEffect(() => { draw(); }, []);
  useEffect(() => { const id = setInterval(draw, 2000); return () => clearInterval(id); }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

// ── Bot Trades tab ────────────────────────────────────────────────────────────
function BotTradesTab() {
  const { botTrades, botStatus } = useStore();
  const balance = botStatus?.balance ?? 10000;
  const pnl = botStatus?.total_pnl ?? 0;
  const wr = botStatus?.win_rate ?? 0;
  const trades = botStatus?.total_trades ?? 0;
  const open = botStatus?.open_positions ?? 0;
  const adapt = botStatus?.adapt_count ?? 0;

  const headStyle = { display: 'grid', gridTemplateColumns: '48px 58px 42px 76px 76px 54px 70px 52px', gap: 4, padding: '4px 10px', fontSize: 8, color: C.text3, letterSpacing: .8, position: 'sticky', top: 0, background: C.bg, borderBottom: `1px solid ${C.bd}` };
  const rowStyle  = { display: 'grid', gridTemplateColumns: '48px 58px 42px 76px 76px 54px 70px 52px', gap: 4, padding: '4px 10px', fontSize: 9, borderBottom: `1px solid rgba(26,37,53,.5)` };
  const badge = (cls, txt) => {
    const map = { l: [C.g2, C.g], s: [C.r2, C.r], w: [C.g2, C.g], x: [C.r2, C.r], o: [C.b2, C.b] };
    const [bg, col] = map[cls] || [C.bg3, C.text2];
    return <span style={{ padding: '1px 5px', borderRadius: 2, fontSize: 8, fontWeight: 700, letterSpacing: .5, background: bg, color: col }}>{txt}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={headStyle}><span>TIME</span><span>PAIR</span><span>SIDE</span><span>ENTRY</span><span>EXIT</span><span>SIZE</span><span>PNL</span><span>RESULT</span></div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {botTrades.length === 0 && (
          <div style={{ padding: '20px 10px', textAlign: 'center', color: C.text3, fontSize: 10 }}>No trades yet. Start the bot to begin.</div>
        )}
        {botTrades.map((t, i) => (
          <div key={i} style={rowStyle}>
            <span style={{ color: C.text3 }}>{t.ts ? new Date(t.ts).toLocaleTimeString('en', { hour12: false }) : '—'}</span>
            <span style={{ color: C.text, fontWeight: 500 }}>{(t.symbol || '').replace('USDT', '')}</span>
            <span>{badge(t.side === 'LONG' ? 'l' : 's', t.side)}</span>
            <span style={{ color: C.text2 }}>{t.entry?.toFixed(t.entry >= 100 ? 2 : 4) ?? '—'}</span>
            <span style={{ color: C.text2 }}>{t.exit?.toFixed(t.exit >= 100 ? 2 : 4) ?? '—'}</span>
            <span style={{ color: C.text2 }}>{t.qty?.toFixed(3) ?? '—'}</span>
            <span style={{ color: (t.pnl ?? 0) >= 0 ? C.g : C.r }}>
              {(t.pnl ?? 0) >= 0 ? '+' : '-'}${Math.abs(t.pnl ?? 0).toFixed(2)}
            </span>
            <span>{badge(t.result === 'WIN' ? 'w' : 'x', t.result ?? '—')}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', borderTop: `1px solid ${C.bd}`, flexShrink: 0 }}>
        {[
          { l: 'BALANCE',  v: '$' + Math.round(balance).toLocaleString(), c: C.acc },
          { l: 'TOTAL PNL', v: (pnl >= 0 ? '+' : '') + fmtUSD(pnl), c: pnl >= 0 ? C.g : C.r },
          { l: 'WIN RATE', v: wr + '%', c: C.b },
          { l: 'OPEN POS', v: open, c: C.p },
          { l: 'AI ADAPT',  v: adapt, c: C.y },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ padding: '6px 8px', borderRight: `1px solid ${C.bd}`, textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: .8 }}>{l}</div>
            <div style={{ fontSize: 13, fontFamily: "'Bebas Neue', sans-serif", marginTop: 2, color: c }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KPI bar ───────────────────────────────────────────────────────────────────
function KPIBar({ markets, selected }) {
  const btc = markets['BTCUSDT'] || {};
  const eth = markets['ETHUSDT'] || {};
  const sel = markets[selected] || {};
  const items = [
    { l: 'BTC/USDT',   v: fmtPrice(btc.price), c: fmtChg(btc.change_pct), up: parseFloat(btc.change_pct ?? 0) >= 0 },
    { l: 'ETH/USDT',   v: fmtPrice(eth.price), c: fmtChg(eth.change_pct), up: parseFloat(eth.change_pct ?? 0) >= 0 },
    { l: selected,     v: fmtPrice(sel.price), c: fmtChg(sel.change_pct), up: parseFloat(sel.change_pct ?? 0) >= 0, hi: true },
    { l: '24H VOLUME', v: sel.volume ? '$' + (parseFloat(sel.volume)).toFixed(1) + 'M' : '—', c: 'CEX+DEX', up: null },
    { l: 'OPEN INT.',  v: '$' + (20 + Math.random() * 15).toFixed(1) + 'B', c: 'FUTURES', up: null },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', borderBottom: `1px solid ${C.bd}`, flexShrink: 0 }}>
      {items.map(({ l, v, c, up, hi }) => (
        <div key={l} style={{ padding: '5px 8px', borderRight: `1px solid ${C.bd}` }}>
          <div style={{ fontSize: 8, color: C.text2, letterSpacing: .5 }}>{l}</div>
          <div style={{ fontSize: 16, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1, marginTop: 1, color: hi ? C.b : (up === null ? C.y : up ? C.g : C.r) }}>{v}</div>
          <div style={{ fontSize: 9, color: up === null ? C.text2 : up ? C.g : C.r }}>{c}</div>
        </div>
      ))}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ['CANDLE', 'ORDER BOOK', 'LIVE TRADES', 'AGENTS', 'BOT TRADES'];

export default function CenterCol() {
  const { markets, selectedPair, activeTab, setActiveTab, agents, botStatus, botRunning } = useStore();
  const data = markets[selectedPair] || {};
  const price = parseFloat(data.price ?? 0);

  const tabStyle = (name) => ({
    padding: '0 10px', height: 24, display: 'flex', alignItems: 'center',
    fontSize: 9, letterSpacing: 1.5, cursor: 'pointer',
    color: activeTab === name ? (name === 'BOT TRADES' ? C.acc : C.g) : C.text2,
    borderBottom: `2px solid ${activeTab === name ? (name === 'BOT TRADES' ? C.acc : C.g) : 'transparent'}`,
    whiteSpace: 'nowrap', transition: 'all .15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: `1px solid ${C.bd}`, borderRight: `1px solid ${C.bd}`, background: C.bg }}>
      <KPIBar markets={markets} selected={selectedPair} />
      <div style={{ display: 'flex', background: C.bg1, borderBottom: `1px solid ${C.bd}`, flexShrink: 0 }}>
        {TABS.map(t => <div key={t} style={tabStyle(t)} onClick={() => setActiveTab(t)}>{t}</div>)}
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {activeTab === 'CANDLE' && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <CandleChart symbol={selectedPair} price={price} />
          </div>
        )}
        {activeTab === 'ORDER BOOK' && <OrderBookTab symbol={selectedPair} price={price} />}
        {activeTab === 'LIVE TRADES' && <LiveTradesTab />}
        {activeTab === 'AGENTS' && <AgentsTab agents={agents} />}
        {activeTab === 'BOT TRADES' && <BotTradesTab />}
      </div>
    </div>
  );
}

// ── Order Book (simulated depth) ───────────────────────────────────────────────
function OrderBookTab({ price }) {
  const asks = [], bids = [];
  for (let i = 5; i > 0; i--) { asks.push({ p: price * (1 + i * 0.00018), s: (Math.random() * 3 + 0.1).toFixed(3) }); }
  for (let i = 1; i <= 5; i++) { bids.push({ p: price * (1 - i * 0.00018), s: (Math.random() * 3 + 0.1).toFixed(3) }); }
  const maxS = Math.max(...asks.map(a => parseFloat(a.s)), ...bids.map(b => parseFloat(b.s)));
  const dec = price >= 100 ? 2 : 4;
  const row = (side, { p, s }) => {
    const w = (parseFloat(s) / maxS * 100).toFixed(0);
    const col = side === 'ask' ? C.r : C.g;
    return (
      <div key={p} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: 10, padding: '1.5px 8px', borderBottom: `1px solid rgba(26,37,53,.4)`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, [side === 'ask' ? 'right' : 'left']: 0, width: w + '%', background: col, opacity: .16 }} />
        {side === 'ask' ? (
          <><span style={{ color: col, position: 'relative' }}>{parseFloat(s).toFixed(3)}</span><span style={{ textAlign: 'center', position: 'relative' }}>{p.toFixed(dec)}</span><span /></>
        ) : (
          <><span /><span style={{ textAlign: 'center', position: 'relative' }}>{p.toFixed(dec)}</span><span style={{ color: col, textAlign: 'right', position: 'relative' }}>{parseFloat(s).toFixed(3)}</span></>
        )}
      </div>
    );
  };
  const spread = asks[asks.length - 1]?.p - bids[0]?.p;
  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: 9, color: C.text3, padding: '3px 8px', borderBottom: `1px solid ${C.bd}`, position: 'sticky', top: 0, background: C.bg }}>
        <span>SIZE</span><span style={{ textAlign: 'center' }}>PRICE</span><span style={{ textAlign: 'right' }}>SIZE</span>
      </div>
      {asks.map(a => row('ask', a))}
      <div style={{ fontSize: 9, color: C.y, textAlign: 'center', padding: 2, border: `1px solid ${C.bd}`, background: C.bg1 }}>
        Spread: {spread?.toFixed(price >= 100 ? 2 : 5)} ({spread && price ? (spread / price * 100).toFixed(4) : '—'}%)
      </div>
      {bids.map(b => row('bid', b))}
    </div>
  );
}

// ── Live Trades (sim) ──────────────────────────────────────────────────────────
function LiveTradesTab() {
  const [trades, setTrades] = useState([]);
  const { markets, selectedPair } = useStore();
  const price = parseFloat(markets[selectedPair]?.price ?? 67000);

  useEffect(() => {
    const add = () => {
      const qty = (Math.random() * 3 + 0.001).toFixed(3);
      const isBuy = Math.random() > 0.48;
      setTrades(prev => [{ p: price, qty, isBuy, val: Math.round(price * parseFloat(qty)) }, ...prev].slice(0, 60));
    };
    const id = setInterval(add, 800);
    return () => clearInterval(id);
  }, [price]);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 1fr 1fr', fontSize: 9, color: C.text3, padding: '3px 8px', borderBottom: `1px solid ${C.bd}`, flexShrink: 0 }}>
        <span>SIDE</span><span>QTY</span><span>PRICE</span><span style={{ textAlign: 'right' }}>VALUE</span>
      </div>
      <div style={{ flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {trades.map((t, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 1fr 1fr', fontSize: 10, padding: '2px 8px', borderBottom: `1px solid rgba(26,37,53,.4)` }}>
            <span style={{ color: t.isBuy ? C.g : C.r }}>{t.isBuy ? 'BUY' : 'SELL'}</span>
            <span style={{ color: C.text2 }}>{t.qty}</span>
            <span>{t.p.toFixed(t.p >= 100 ? 2 : 4)}</span>
            <span style={{ textAlign: 'right', color: C.text2 }}>${t.val.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Agents tab ────────────────────────────────────────────────────────────────
function AgentsTab({ agents }) {
  if (!agents?.length) return <div style={{ padding: 20, color: C.text3, fontSize: 10 }}>Loading agents...</div>;
  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: 8 }}>
      {agents.map(a => {
        const actCol = ['ACCUMULATE','PUMP','TREND'].includes(a.action) ? C.g : ['DUMP','SCALP'].includes(a.action) ? C.r : C.y;
        return (
          <div key={a.id} style={{ padding: '6px 8px', borderBottom: `1px solid ${C.bd}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 500, marginBottom: 3 }}>
              <span style={{ color: a.color }}>{a.name || a.role?.toUpperCase()}</span>
              <span style={{ color: a.pnl >= 0 ? C.g : C.r }}>{a.pnl >= 0 ? '+' : ''}{a.pnl?.toFixed(2)}%</span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2, marginBottom: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: Math.min(100, Math.abs(a.pnl ?? 0) * 8 + 20) + '%', background: a.color, borderRadius: 2, transition: 'width .6s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.text2 }}>
              <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 2, fontWeight: 600, background: actCol + '22', color: actCol }}>{a.action}</span>
              <span>TRADES: {a.trades ?? 0}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
