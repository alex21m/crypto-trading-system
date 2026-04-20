/**
 * GET /api/binance/klines?symbol=BTCUSDT&interval=5m&limit=100
 * Proxy Binance Futures klines — public endpoint.
 */
const https = require('https');

const BINANCE_FAPI = process.env.BINANCE_TESTNET === 'true'
  ? 'https://testnet.binancefuture.com'
  : 'https://fapi.binance.com';

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    }).on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { symbol = 'BTCUSDT', interval = '5m', limit = '100' } = req.query;
    const url = `${BINANCE_FAPI}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const raw = await fetch(url);
    const candles = Array.isArray(raw)
      ? raw.map(r => ({
          t: r[0], o: +r[1], h: +r[2], l: +r[3], c: +r[4], v: +r[5],
        }))
      : raw;
    res.status(200).json(candles);
  } catch (err) {
    res.status(502).json({ error: 'Binance unreachable', detail: err.message });
  }
};
