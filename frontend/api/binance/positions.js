/**
 * GET /api/binance/positions
 * HMAC-signed — returns current open Futures positions.
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

function signedGet(path, params = {}) {
  return new Promise((resolve, reject) => {
    params.timestamp = Date.now();
    params.recvWindow = 5000;
    const qs = querystring.stringify(params);
    const signature = crypto
      .createHmac('sha256', API_SECRET)
      .update(qs)
      .digest('hex');
    const options = {
      hostname: BASE, port: 443,
      path: `${path}?${qs}&signature=${signature}`,
      method: 'GET',
      headers: { 'X-MBX-APIKEY': API_KEY },
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({ error: 'Binance API keys not configured' });
  }

  try {
    const result = await signedGet('/fapi/v2/positionRisk');
    const positions = Array.isArray(result.body)
      ? result.body.filter(p => parseFloat(p.positionAmt) !== 0)
      : result.body;
    res.status(result.status).json(positions);
  } catch (err) {
    res.status(502).json({ error: 'Positions fetch failed', detail: err.message });
  }
};
