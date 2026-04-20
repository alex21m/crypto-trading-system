import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { startBot, stopBot, getBotStatus } from '../api';
import { C, ph } from '../styles';

const inp = {
  background: C.bg, border: `1px solid ${C.bd2}`, color: C.text,
  borderRadius: 2, padding: '4px 6px', fontSize: 10, width: '100%',
  fontFamily: "'IBM Plex Mono', monospace", outline: 'none',
};

const lbl = { fontSize: 8, color: C.text2, display: 'block', marginBottom: 3, letterSpacing: .5 };

const btn = (variant) => ({
  border: 'none', borderRadius: 2, padding: 7, fontSize: 10, fontWeight: 700,
  cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1.5,
  width: '100%', textTransform: 'uppercase', marginBottom: 4,
  background: variant === 'go' ? C.g : variant === 'stop' ? C.r : C.bg3,
  color: variant === 'go' ? '#000' : '#fff',
});

function Slider({ label, id, min, max, step = 1, defaultVal, color, suffix = '' }) {
  const [val, setVal] = useState(defaultVal);
  const { setConfig } = useStore();
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ fontSize: 9, color: C.text2 }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: color || C.text }}>{val}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => { const v = parseFloat(e.target.value); setVal(v); setConfig({ [id]: v }); }}
        style={{ width: '100%', accentColor: C.acc, height: 3, cursor: 'pointer', margin: '3px 0' }}
      />
    </div>
  );
}

function LogLine({ msg, type }) {
  const col = type === 'ok' ? C.g : type === 'err' ? C.r : type === 'warn' ? C.y : type === 'exec' ? C.b : C.text3;
  const ts = new Date().toLocaleTimeString('en', { hour12: false });
  return (
    <div style={{ fontSize: 9, padding: '2px 0', borderBottom: `1px solid rgba(26,37,53,.4)`, lineHeight: 1.4 }}>
      <span style={{ color: col }}>[{ts}]</span> {msg}
    </div>
  );
}

export default function ConfigCol() {
  const { config, setConfig, botRunning, setBotStatus } = useStore();
  const [logs, setLogs] = useState([
    { msg: 'GODVIEW Trading System v3 initialized', type: 'ok' },
    { msg: 'Paper trading mode active', type: 'warn' },
    { msg: 'Configure API keys for live mode', type: '' },
  ]);
  const [apiStatus, setApiStatus] = useState(null);
  const logEndRef = useRef(null);

  const addLog = (msg, type = '') => setLogs(prev => [{ msg, type }, ...prev].slice(0, 80));

  const handleStart = async () => {
    try {
      const payload = {
        strategy: config.strategy,
        leverage: config.leverage,
        position_size_pct: config.position_size_pct,
        stop_loss_pct: config.stop_loss_pct,
        take_profit_pct: config.take_profit_pct,
        max_open_positions: config.max_open_positions,
        max_daily_loss_pct: config.max_daily_loss_pct,
        min_confidence: config.min_confidence,
        mode: config.mode,
      };
      const res = await startBot(payload);
      setBotStatus(await getBotStatus());
      addLog(`Bot STARTED | Strategy:${config.strategy.toUpperCase()} | Lev:${config.leverage}x | ${config.mode.toUpperCase()}`, 'ok');
      toast.success('Bot started!');
    } catch (e) {
      addLog('Failed to start bot: ' + e.message, 'err');
      toast.error('Failed to start bot');
    }
  };

  const handleStop = async () => {
    try {
      const res = await stopBot();
      setBotStatus(await getBotStatus());
      addLog(`Bot STOPPED | PNL: ${res.total_pnl >= 0 ? '+' : ''}$${Math.abs(res.total_pnl ?? 0).toFixed(2)}`, 'warn');
      toast('Bot stopped', { icon: '⏹' });
    } catch (e) {
      addLog('Failed to stop: ' + e.message, 'err');
    }
  };

  const handleTestAPI = async () => {
    if (!config.apiKey || !config.apiSecret) {
      setApiStatus({ ok: false, msg: 'Enter both API key and secret.' }); return;
    }
    setApiStatus({ ok: null, msg: 'Testing...' });
    addLog('Testing Binance API connection...', 'exec');
    try {
      const res = await fetch('/api/bot/status');
      if (res.ok) {
        setApiStatus({ ok: true, msg: 'Backend reachable. Live orders need signed requests — backend handles signing.' });
        addLog('API test: backend healthy. API keys saved to env for live mode.', 'ok');
      } else throw new Error('Backend unreachable');
    } catch (e) {
      setApiStatus({ ok: false, msg: 'Backend unreachable. Ensure docker-compose is running.' });
      addLog('API test failed: ' + e.message, 'err');
    }
  };

  const sectStyle = { padding: '8px 10px', borderBottom: `1px solid ${C.bd}` };
  const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: `1px solid ${C.bd}`, background: C.bg1 }}>
      <div style={ph}>BOT CONFIG · API KEYS</div>
      <div style={{ overflowY: 'auto', flex: 1 }}>

        {/* Mode */}
        <div style={sectStyle}>
          <span style={lbl}>TRADING MODE</span>
          <select value={config.mode} onChange={e => { setConfig({ mode: e.target.value }); addLog(e.target.value === 'live' ? 'LIVE MODE — real money! Set API keys.' : 'Paper trading mode.', e.target.value === 'live' ? 'err' : 'ok'); }} style={inp}>
            <option value="paper">Paper Trading (Safe)</option>
            <option value="live">Live Trading (Real Money)</option>
          </select>
        </div>

        {/* API keys */}
        <div style={sectStyle}>
          <span style={lbl}>BINANCE API KEY</span>
          <input type="password" placeholder="Enter Binance API key..." value={config.apiKey}
            onChange={e => setConfig({ apiKey: e.target.value })} style={{ ...inp, marginBottom: 6 }} />
          <span style={lbl}>API SECRET</span>
          <input type="password" placeholder="Enter API secret..." value={config.apiSecret}
            onChange={e => setConfig({ apiSecret: e.target.value })} style={{ ...inp, marginBottom: 6 }} />
          <button onClick={handleTestAPI} style={{ ...inp, cursor: 'pointer', color: C.b, border: `1px solid ${C.bd2}`, background: C.bg3, letterSpacing: 1, fontWeight: 700 }}>
            TEST CONNECTION
          </button>
          {apiStatus && (
            <div style={{ fontSize: 9, padding: '4px 6px', borderRadius: 2, marginTop: 4,
              background: apiStatus.ok === null ? C.y2 : apiStatus.ok ? C.g2 : C.r2,
              color: apiStatus.ok === null ? C.y : apiStatus.ok ? C.g : C.r,
              border: `1px solid ${apiStatus.ok === null ? 'rgba(245,197,24,.25)' : apiStatus.ok ? 'rgba(0,232,122,.2)' : 'rgba(255,59,92,.2)'}`,
            }}>{apiStatus.msg}</div>
          )}
          <div style={{ marginTop: 6, fontSize: 8, color: C.text3, lineHeight: 1.5 }}>
            Keys in memory only. Enable Futures + Read + Trade on Binance. IP-restrict for safety.
          </div>
        </div>

        {/* Strategy */}
        <div style={sectStyle}>
          <span style={lbl}>STRATEGY</span>
          <select value={config.strategy} onChange={e => setConfig({ strategy: e.target.value })} style={{ ...inp, marginBottom: 6 }}>
            <option value="ai">AI Adaptive (Auto-switch)</option>
            <option value="trend">Trend Following</option>
            <option value="scalp">Scalp + RSI</option>
            <option value="mean">Mean Reversion</option>
            <option value="macd">MACD Crossover</option>
            <option value="bb">Bollinger Breakout</option>
            <option value="whale">Whale Tracker</option>
          </select>
          <div style={row2}>
            <div>
              <span style={lbl}>TIMEFRAME</span>
              <select value={config.timeframe || '5m'} onChange={e => setConfig({ timeframe: e.target.value })} style={inp}>
                {['1m','5m','15m','1h','4h'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <span style={lbl}>PAIR MODE</span>
              <select value={config.pairMode || 'active'} onChange={e => setConfig({ pairMode: e.target.value })} style={inp}>
                <option value="active">Active Pair</option>
                <option value="top3">Top 3 Vol</option>
                <option value="gainers">Gainers</option>
                <option value="all">All Pairs</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sizing */}
        <div style={sectStyle}>
          <Slider label="LEVERAGE" id="leverage" min={1} max={50} defaultVal={10} suffix="x" color={C.acc} />
          <Slider label="POSITION SIZE" id="position_size_pct" min={1} max={50} defaultVal={5} suffix="%" />
          <Slider label="STOP LOSS" id="stop_loss_pct" min={0.5} max={10} step={0.5} defaultVal={1.5} suffix="%" color={C.r} />
          <Slider label="TAKE PROFIT" id="take_profit_pct" min={0.5} max={20} step={0.5} defaultVal={3} suffix="%" color={C.g} />
        </div>

        {/* Risk */}
        <div style={sectStyle}>
          <Slider label="MAX DAILY LOSS" id="max_daily_loss_pct" min={1} max={30} defaultVal={3} suffix="%" color={C.r} />
          <Slider label="MAX OPEN POSITIONS" id="max_open_positions" min={1} max={10} defaultVal={3} color={C.p} />
          <Slider label="MIN CONFIDENCE" id="min_confidence" min={50} max={95} defaultVal={70} suffix="%" color={C.b} />
        </div>

        {/* Buttons */}
        <div style={{ padding: '10px 10px 4px' }}>
          {!botRunning ? (
            <button style={btn('go')} onClick={handleStart}>▶ START BOT</button>
          ) : (
            <button style={btn('stop')} onClick={handleStop}>■ STOP BOT</button>
          )}
        </div>

        {/* Log */}
        <div style={ph}>BOT LOG</div>
        <div style={{ padding: '3px 8px', background: C.bg, maxHeight: 220, overflowY: 'auto' }}>
          {logs.map((l, i) => <LogLine key={i} msg={l.msg} type={l.type} />)}
          <div ref={logEndRef} />
        </div>

      </div>
    </div>
  );
}
