import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { botAPI } from '../api';

export default function TopBar() {
  const botStatus = useStore((s) => s.botStatus);
  const [clock, setClock] = useState(new Date().toUTCString());

  useEffect(() => {
    const interval = setInterval(() => {
      setClock(new Date().toUTCString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await botAPI.getStatus();
        useStore.setState({ botStatus: res.data });
      } catch (e) {
        console.error('[TopBar] Status error:', e);
      }
    };
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="topbar" style={{
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '0 15px', 
      background: '#0a0f18', 
      borderBottom: '1px solid #1a2535'
    }}>
      <div className="logo" style={{fontSize: '14px', fontWeight: 700}}>
        GODVIEW <span style={{color: '#3d5570', fontSize: '10px'}}>// PHASE 3 · TRADING BOT</span>
      </div>
      <div className="tb-stats" style={{display: 'flex', gap: '20px', fontSize: '11px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
          <div style={{width: '6px', height: '6px', background: '#00e87a', borderRadius: '50%'}}></div>
          <span style={{color: '#7a94ab'}}>WS</span>
          <span style={{color: '#00e87a', fontWeight: 700}}>CONNECTED</span>
        </div>
        <div style={{display: 'flex', gap: '5px'}}>
          <span style={{color: '#7a94ab'}}>BOT</span>
          <span style={{color: botStatus?.running ? '#00e87a' : '#ff3b5c', fontWeight: 700}}>
            {botStatus?.running ? 'RUNNING' : 'STOPPED'}
          </span>
        </div>
        <div style={{display: 'flex', gap: '5px'}}>
          <span style={{color: '#7a94ab'}}>BALANCE</span>
          <span style={{fontWeight: 700}}>${botStatus?.balance?.toFixed(2) || '10,000'}</span>
        </div>
      </div>
      <div className="tb-clock" style={{color: '#7a94ab', fontSize: '11px'}}>{clock.split(' ')[4]} UTC</div>
    </div>
  );
}
