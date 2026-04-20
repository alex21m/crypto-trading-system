import React from 'react';
import { useStore } from '../store';
import { C, fmtPrice, ph, scrollCol } from '../styles';

const NEWS_DB = [
  ['BlackRock BTC ETF sees $420M single-day inflow','BULLISH'],
  ['Fed holds rates — risk assets rally globally','BULLISH'],
  ['Ethereum Dencun upgrade reduces L2 fees 90%','BULLISH'],
  ['SEC delays spot ETH ETF decision 90 days','BEARISH'],
  ['Crypto hedge fund $1.2B liquidation cascade','BEARISH'],
  ['Bitcoin hashrate hits all-time high 650 EH/s','BULLISH'],
  ['MicroStrategy buys 10,000 BTC in Q1 2025','BULLISH'],
  ['DeFi TVL breaks $200B for first time ever','BULLISH'],
  ['CFTC sues major DeFi protocol for unregistered swaps','BEARISH'],
  ['Whale alert: 18,000 BTC moved to cold storage','BULLISH'],
  ['US CPI data: 3.2% vs 3.4% expected — risk rally','BULLISH'],
  ['Spot BTC ETF daily volume surpasses $5B','BULLISH'],
  ['EU MiCA framework goes live — cautious optimism','NEUTRAL'],
  ['Coinbase launches international derivatives exchange','BULLISH'],
  ['Tether freezes $300M USDT flagged on-chain','NEUTRAL'],
];

const SENTS = ['WEB3 INDEX','TWITTER/X','REDDIT','TELEGRAM','POLICY SCAN'];
const MFMODELS = ['LSTM·v3','RL·PPO','Transformer','Ensemble','GRU·Attn'];

function MiroFish({ markets, selected }) {
  const data = markets[selected] || {};
  const price = parseFloat(data.price ?? 0);
  const chg = parseFloat(data.change_pct ?? 0);
  const conf = 68 + Math.round(Math.random() * 29);
  const dir = chg >= 0 ? 'LONG' : 'SHORT';
  const dc = dir === 'LONG' ? C.g : C.r;
  const model = MFMODELS[Math.floor(Math.random() * MFMODELS.length)];
  const tgt = price * (1 + (Math.random() * 0.027 + 0.003));
  const sl  = price * (1 - (Math.random() * 0.015 + 0.005));
  const C2  = 2 * Math.PI * 17;
  const dash = C2 * (conf / 100);
  const grid = [
    { l: 'TARGET',    v: fmtPrice(tgt), c: C.g },
    { l: 'STOP LOSS', v: fmtPrice(sl),  c: C.r },
    { l: 'RSI',       v: (28 + Math.round(Math.random() * 47)).toString(), c: C.text },
    { l: 'R/R RATIO', v: (1.5 + Math.random() * 2.5).toFixed(1) + 'x', c: C.g },
    { l: 'MOMENTUM',  v: (0.3 + Math.random() * 0.65).toFixed(2), c: C.b },
    { l: 'VOL SIGNAL',v: ['RISING','FALLING','NEUTRAL'][Math.floor(Math.random() * 3)], c: C.y },
  ];

  return (
    <div style={{ padding: '8px 9px', borderBottom: `1px solid ${C.bd}`, background: C.b2 }}>
      <div style={{ fontSize: 9, color: C.b, letterSpacing: 1.5, marginBottom: 6, fontFamily: "'Bebas Neue', sans-serif" }}>
        MIROFISH AI · {selected.replace('USDT', '')}/USDT
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg style={{ transform: 'rotate(-90deg)' }} width="40" height="40" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="17" fill="none" stroke="rgba(45,156,255,.12)" strokeWidth="4" />
            <circle cx="21" cy="21" r="17" fill="none" stroke={C.b} strokeWidth="4"
              strokeDasharray={`${dash.toFixed(1)} ${C2.toFixed(1)}`} strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: C.b }}>{conf}%</div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontFamily: "'Bebas Neue', sans-serif", color: dc, letterSpacing: 1 }}>{dir}</div>
          <div style={{ fontSize: 9, color: C.text2 }}>{model} · 5m</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px' }}>
        {grid.map(({ l, v, c }) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 8, color: C.text2 }}>{l}</span>
            <span style={{ fontSize: 10, fontWeight: 500, marginTop: 1, color: c }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsensusBox({ consensus }) {
  const bull = consensus?.bull_pct ?? Math.round(42 + Math.random() * 36);
  const bear = 100 - bull;
  const C2 = 2 * Math.PI * 17;
  const col = bull > 60 ? C.g : bull < 45 ? C.r : C.y;
  const dir = bull > 60 ? 'BULLISH' : bull < 45 ? 'BEARISH' : 'NEUTRAL';

  return (
    <div style={{ padding: '8px 9px', borderBottom: `1px solid ${C.bd}` }}>
      <div style={{ fontSize: 9, color: C.p, letterSpacing: 1.5, marginBottom: 6, fontFamily: "'Bebas Neue', sans-serif" }}>CONSENSUS ENGINE</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg style={{ transform: 'rotate(-90deg)' }} width="40" height="40" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="17" fill="none" stroke="rgba(199,125,255,.12)" strokeWidth="4" />
            <circle cx="21" cy="21" r="17" fill="none" stroke={col} strokeWidth="4"
              strokeDasharray={`${(C2 * bull / 100).toFixed(1)} ${C2.toFixed(1)}`} strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: col }}>{bull}%</div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontFamily: "'Bebas Neue', sans-serif", color: col }}>{dir}</div>
          <div style={{ fontSize: 9, color: C.text2 }}>{consensus?.clusters ?? Math.round(3 + Math.random() * 6)} clusters · {consensus?.agents_count ?? Math.round(120 + Math.random() * 280)} agents</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px' }}>
        {[
          { l: 'BULL VOTES', v: bull + '%', c: C.g },
          { l: 'BEAR VOTES', v: bear + '%', c: C.r },
          { l: 'SIGNAL STR', v: consensus?.signal_strength ?? 'MODERATE', c: C.p },
          { l: 'DIVERGENCE', v: (Math.random() * 0.4).toFixed(2), c: C.y },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 8, color: C.text2 }}>{l}</span>
            <span style={{ fontSize: 10, fontWeight: 500, marginTop: 1, color: c }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalFeed({ signals }) {
  const db = [
    ['BUY','RSI oversold + vol spike','LSTM·v3'],
    ['BUY','Whale accumulation pattern','Ensemble'],
    ['BUY','MACD bullish crossover','Transformer'],
    ['SELL','Bearish divergence RSI 4H','LSTM·v3'],
    ['SELL','Liquidation cascade risk','RL·PPO'],
    ['HOLD','Neutral consolidation zone','Ensemble'],
  ];
  const items = signals?.length ? signals : db.slice(0, 4).map((s, i) => ({
    action: s[0], reason: s[1], model: s[2],
    pair: ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'][i % 4],
    confidence: 66 + Math.round(Math.random() * 31),
  }));
  const bc = (a) => a === 'BUY'
    ? { bg: 'rgba(0,232,122,.15)', c: C.g }
    : a === 'SELL'
    ? { bg: 'rgba(255,59,92,.15)', c: C.r }
    : { bg: C.y2, c: C.y };

  return (
    <div>
      {items.slice(0, 4).map((sig, i) => {
        const { bg, c } = bc(sig.action);
        return (
          <div key={i} style={{ padding: '5px 8px', borderBottom: `1px solid ${C.bd}` }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8, fontWeight: 600, padding: '1px 5px', borderRadius: 2, letterSpacing: 1, marginBottom: 2, background: bg, color: c }}>{sig.action}</span>
            <div style={{ fontSize: 10, fontWeight: 500 }}>{(sig.pair || '').replace('USDT', '')}/USDT</div>
            <div style={{ fontSize: 9, color: C.text2, marginTop: 1 }}>{sig.reason}</div>
            <div style={{ fontSize: 9, color: C.b }}>Conf: {sig.confidence}% <span style={{ color: C.text3 }}>· {sig.model}</span></div>
          </div>
        );
      })}
    </div>
  );
}

function SentimentFeed() {
  return (
    <div>
      {SENTS.map(s => {
        const v = Math.round(28 + Math.random() * 50);
        const col = v > 60 ? C.g : v < 42 ? C.r : C.y;
        const lbl = v > 60 ? 'BULL' : v < 42 ? 'BEAR' : 'NEUT';
        return (
          <div key={s} style={{ padding: '4px 8px', borderBottom: `1px solid ${C.bd}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 2 }}>
              <span style={{ color: C.text2 }}>{s}</span>
              <span style={{ color: col }}>{v}% {lbl}</span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,.05)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: v + '%', background: col, borderRadius: 2, transition: 'width 1.5s' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NewsFeed() {
  const items = NEWS_DB.slice(0, 8);
  const tagStyle = (s) => ({
    fontSize: 7, fontWeight: 600, padding: '1px 4px', borderRadius: 2, display: 'inline-block', marginTop: 2,
    background: s === 'BULLISH' ? 'rgba(0,232,122,.12)' : s === 'BEARISH' ? 'rgba(255,59,92,.12)' : 'rgba(245,197,24,.08)',
    color: s === 'BULLISH' ? C.g : s === 'BEARISH' ? C.r : C.y,
  });
  return (
    <div>
      {items.map(([txt, sentiment], i) => (
        <div key={i} style={{ padding: '5px 8px', borderBottom: `1px solid ${C.bd}`, cursor: 'pointer' }}>
          <div style={{ fontSize: 8, color: C.text3, marginBottom: 2 }}>{Math.round(1 + Math.random() * 58)}m ago · CryptoWire</div>
          <div style={{ fontSize: 9, lineHeight: 1.4 }}>{txt}</div>
          <span style={tagStyle(sentiment)}>{sentiment}</span>
        </div>
      ))}
    </div>
  );
}

export default function RightCol() {
  const { markets, selectedPair, signals, consensus } = useStore();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: `1px solid ${C.bd}`, borderRight: `1px solid ${C.bd}` }}>
      <div style={ph}>MIROFISH AI · GODVIEW</div>
      <div style={{ ...scrollCol }}>
        <MiroFish markets={markets} selected={selectedPair} />
        <div style={ph}>CONSENSUS ENGINE</div>
        <ConsensusBox consensus={consensus} />
        <div style={ph}>AI SIGNALS</div>
        <SignalFeed signals={signals} />
        <div style={ph}>NLP SENTIMENT</div>
        <SentimentFeed />
        <div style={ph}>NEWS · LIVE</div>
        <NewsFeed />
      </div>
    </div>
  );
}
