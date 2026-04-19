import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useStore } from '../store';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || '';

export function useSocket() {
  const socketRef = useRef(null);
  const { updateMarketTick, setAgents, setWsConnected } = useStore();

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setWsConnected(true);
      console.log('[socket] connected');
    });

    socket.on('disconnect', () => {
      setWsConnected(false);
      console.log('[socket] disconnected');
    });

    socket.on('market_update', (data) => {
      if (data && typeof data === 'object') {
        Object.values(data).forEach((tick) => {
          if (tick?.symbol) updateMarketTick(tick);
        });
      }
    });

    socket.on('agent_update', (agents) => {
      if (Array.isArray(agents)) setAgents(agents);
    });

    return () => { socket.disconnect(); };
  }, []);

  return socketRef.current;
}
