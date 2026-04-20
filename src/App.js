import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useStore } from './store';
import TopBar from './components/TopBar';
import LeftPanel from './components/LeftPanel';
import CenterPanel from './components/CenterPanel';
import RightPanel from './components/RightPanel';
import ConfigPanel from './components/ConfigPanel';
import './App.css';

export default function App() {
  const [socket, setSocket] = useState(null);
  const setMarkets = useStore((s) => s.setMarkets);
  const setAgents = useStore((s) => s.setAgents);

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const s = io(API_URL, { transports: ['websocket'] });

    s.on('connect', () => console.log('[Socket] Connected'));
    s.on('market_update', (data) => setMarkets(data));
    s.on('agent_update', (data) => setAgents(data));

    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [setMarkets, setAgents]);

  return (
    <div className="app">
      <TopBar />
      <div className="body">
        <LeftPanel />
        <CenterPanel socket={socket} />
        <RightPanel />
        <ConfigPanel />
      </div>
    </div>
  );
}
