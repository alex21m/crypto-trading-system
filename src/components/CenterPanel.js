import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { marketAPI, botAPI } from '../api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function CenterPanel() {
  const selectedPair = useStore((s) => s.selectedPair);
  const [tab, setTab] = useState('candle');
  const [klines, setKlines] = useState([]);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (tab === 'candle') {
          // Mocking data if API is not yet supplying full candle history
          setKlines([
            {t: Date.now() - 300000, c: 45000},
            {t: Date.now() - 240000, c: 45200},
            {t: Date.now() - 180000, c: 45600},
            {t: Date.now() - 120000, c: 45400},
            {t: Date.now() - 60000, c: 45800},
          ]);
        } else if (tab === 'bottrades') {
          const res = await botAPI.getTrades();
          setTrades(res.data || []);
        }
      } catch (e) {
        console.error('[CenterPanel] Data error:', e);
      }
    };
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [tab, selectedPair]);

  const chartData = {
    labels: klines.map(k => new Date(k.t).toLocaleTimeString()),
    datasets: [{
      label: selectedPair,
      data: klines.map(k => k.c),
      borderColor: '#00e87a',
      backgroundColor: 'rgba(0, 232, 122, 0.1)',
      tension: 0.4,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#1a2535' }, ticks: { color: '#3d5570', font: { size: 9 } } },
      y: { grid: { color: '#1a2535' }, ticks: { color: '#3d5570', font: { size: 9 } } }
    }
  };

  return (
    <div className="col" style={{background: '#05070a', display: 'flex', flexDirection: 'column'}}>
      <div style={{display: 'flex', background: '#080c12', borderBottom: '1px solid #1a2535'}}>
        {['CANDLE', 'ORDER BOOK', 'BOT TRADES'].map((t) => (
          <div 
            key={t}
            onClick={() => setTab(t.toLowerCase().replace(' ', ''))}
            style={{
              padding: '8px 15px', 
              fontSize: '10px', 
              cursor: 'pointer',
              color: tab === t.toLowerCase().replace(' ', '') ? '#00e87a' : '#3d5570',
              borderBottom: tab === t.toLowerCase().replace(' ', '') ? '2px solid #00e87a' : 'none'
            }}
          >
            {t}
          </div>
        ))}
      </div>
      <div style={{flex: 1, padding: '20px', overflow: 'hidden'}}>
        {tab === 'candle' && <Line data={chartData} options={chartOptions} />}
        {tab === 'bottrades' && (
          <div style={{fontSize: '11px'}}>
            {trades.length === 0 ? <div style={{color: '#3d5570'}}>No recent trades</div> : 
              trades.map((t, i) => (
                <div key={i} style={{padding: '5px 0', borderBottom: '1px solid #1a2535', display: 'flex', justifyContent: 'space-between'}}>
                  <span>{t.symbol} {t.side}</span>
                  <span style={{color: t.pnl >= 0 ? '#00e87a' : '#ff3b5c'}}>${t.pnl?.toFixed(2)}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
