/**
 * GET /api/binance/depth?symbol=BTCUSDT&limit=20
 * Proxy Binance Futures order book — public endpoint.
 */
const https = require('https');

const BINANCE_FAPI = process.env.BINANCE_TESTNET === 'true'
  ? 'https://testnet.binancefuture.com'
  : 'https://fapi.binance.com';

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 8000 }, (res) => {
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
    const { symbol = 'BTCUSDT', limit = '20' } = req.query;
    const url = `${BINANCE_FAPI}/fapi/v1/depth?symbol=${symbol}&limit=${limit}`;
    const data = await fetch(url);
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Binance unreachable', detail: err.message });
  }
};
