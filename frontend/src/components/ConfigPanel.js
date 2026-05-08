import React, { useState } from 'react';
import { botAPI } from '../api';
import toast from 'react-hot-toast';

export default function ConfigPanel() {
  const [mode, setMode] = useState('paper');
  const [strategy, setStrategy] = useState('ai');
  const [leverage, setLeverage] = useState(10);
  const [posSize, setPosSize] = useState(5);

  const handleStart = async () => {
    try {
      const config = {
        mode,
        strategy,
        leverage: parseInt(leverage),
        position_size_pct: parseFloat(posSize),
      };
      await botAPI.start(config);
      toast.success('Bot started successfully!');
    } catch (e) {
      toast.error('Failed to start bot. Check connection.');
    }
  };

  const handleStop = async () => {
    try {
      await botAPI.stop();
      toast.success('Bot stopped.');
    } catch (e) {
      toast.error('Failed to stop bot.');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '6px',
    background: '#05070a',
    border: '1px solid #1a2535',
    color: '#c8d8e8',
    fontSize: '11px',
    borderRadius: '2px',
    marginBottom: '10px'
  };

  const labelStyle = {
    fontSize: '9px',
    color: '#7a94ab',
    display: 'block',
    marginBottom: '4px',
    letterSpacing: '0.5px'
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <div className="ph" style={{fontSize: '10px', background: '#080c12', padding: '4px 9px', color: '#3d5570'}}>BOT CONFIGURATION</div>
      <div style={{padding: '15px', flex: 1, overflowY: 'auto'}}>
        <div style={{marginBottom: '15px'}}>
          <label style={labelStyle}>EXECUTION MODE</label>
          <select style={inputStyle} value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="paper">PAPER TRADING</option>
            <option value="live">LIVE TRADING</option>
          </select>
        </div>

        <div style={{marginBottom: '15px'}}>
          <label style={labelStyle}>AI STRATEGY</label>
          <select style={inputStyle} value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            <option value="ai">AI ADAPTIVE</option>
            <option value="trend">TREND FOLLOWING</option>
            <option value="scalp">SCALPING</option>
          </select>
        </div>

        <div style={{marginBottom: '15px'}}>
          <label style={labelStyle}>LEVERAGE (1x-20x)</label>
          <input style={inputStyle} type="number" min="1" max="20" value={leverage} onChange={(e) => setLeverage(e.target.value)} />
        </div>

        <div style={{marginBottom: '15px'}}>
          <label style={labelStyle}>POSITION SIZE %</label>
          <input style={inputStyle} type="number" min="1" max="100" value={posSize} onChange={(e) => setPosSize(e.target.value)} />
        </div>

        <button 
          onClick={handleStart}
          style={{
            width: '100%', 
            padding: '10px', 
            background: '#00e87a', 
            border: 'none', 
            color: '#000', 
            fontWeight: 700, 
            fontSize: '11px', 
            cursor: 'pointer',
            borderRadius: '2px',
            marginBottom: '8px'
          }}
        >
          START TRADING ENGINE
        </button>
        
        <button 
          onClick={handleStop}
          style={{
            width: '100%', 
            padding: '10px', 
            background: '#ff3b5c', 
            border: 'none', 
            color: '#fff', 
            fontWeight: 700, 
            fontSize: '11px', 
            cursor: 'pointer',
            borderRadius: '2px'
          }}
        >
          FORCE STOP
        </button>
      </div>
    </div>
  );
}
