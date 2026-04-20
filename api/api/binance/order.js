/**
 * POST /api/binance/order
 * HMAC-signed Binance Futures order — server-side signing, no CORS issue.
 * Body: { symbol, side, type, quantity, ... }
 */
const https = require('https');
const crypto = require('crypto');
const querystring = require('querystring');

const API_KEY    = process.env.BINANCE_API_KEY || '';
const API_SECRET = process.env.BINANCE_API_SECRET || '';
const TESTNET    = process.env.BINANCE_TESTNET === 'true';
const BASE       = TESTNET
  ? 'testnet.binancefuture.com'
  : 'fapi.binance.com';

function signedRequest(method, path, params) {
  return new Promise((resolve, reject) => {
    params.timestamp = Date.now();
    params.recvWindow = 5000;
    const qs = querystring.stringify(params);
    const signature = crypto
      .createHmac('sha256', API_SECRET)
      .update(qs)
      .digest('hex');
    const fullQs = `${qs}&signature=${signature}`;
    const options = {
      hostname: BASE,
      port: 443,
      path: `${path}?${fullQs}`,
      method,
      headers: {
        'X-MBX-APIKEY': API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({ error: 'Binance API keys not configured on server' });
  }

  try {
    const { symbol, side, type = 'MARKET', quantity, timeInForce, price } = req.body || {};
    if (!symbol || !side || !quantity) {
      return res.status(400).json({ error: 'Missing required: symbol, side, quantity' });
    }
    const params = { symbol, side, type, quantity: String(quantity) };
    if (type === 'LIMIT') {
      params.timeInForce = timeInForce || 'GTC';
      params.price = String(price);
    }
    const result = await signedRequest('POST', '/fapi/v1/order', params);
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(502).json({ error: 'Order failed', detail: err.message });
  }
};
