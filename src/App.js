import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useSocket } from './hooks/useSocket';
import { useDataPolling } from './hooks/useDataPolling';
import TopBar from './components/TopBar';
import LeftCol from './components/LeftCol';
import CenterCol from './components/CenterCol';
import RightCol from './components/RightCol';
import ConfigCol from './components/ConfigCol';
import TickerBar from './components/TickerBar';

const styles = {
  app: {
    display: 'grid',
    gridTemplateRows: '40px 1fr 22px',
    height: '100vh',
    overflow: 'hidden',
    background: '#05070a',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    color: '#c8d8e8',
  },
  body: {
    display: 'grid',
    gridTemplateColumns: '185px 1fr 185px 220px',
    overflow: 'hidden',
  },
};

export default function App() {
  useSocket();
  useDataPolling(4000);

  return (
    <div style={styles.app}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0e141e',
            color: '#c8d8e8',
            border: '1px solid #1a2535',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
          },
        }}
      />
      <TopBar />
      <div style={styles.body}>
        <LeftCol />
        <CenterCol />
        <RightCol />
        <ConfigCol />
      </div>
      <TickerBar />
    </div>
  );
}
