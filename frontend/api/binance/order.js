const https = require('https');
const crypto = require('crypto');
const BINANCE_FAPI = process.env.BINANCE_TESTNET === 'true' ? 'https://testnet.binancefuture.com' : 'https://fapi.binance.com';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: "Server API keys not configured. Set BINANCE_API_KEY and BINANCE_API_SECRET in Vercel." });
  }

  try {
    const timestamp = Date.now();
    let query = `timestamp=${timestamp}`;
    for (const key in req.query) {
      if (key !== 'timestamp' && key !== 'signature') query += `&${key}=${req.query[key]}`;
    }
    const signature = crypto.createHmac('sha256', apiSecret).update(query).digest('hex');
    const url = `${BINANCE_FAPI}/fapi/v1/order?${query}&signature=${signature}`;

    const options = { method: 'POST', headers: { 'X-MBX-APIKEY': apiKey } };
    const reqBinance = https.request(url, options, (bres) => {
      let data = '';
      bres.on('data', (d) => data += d);
      bres.on('end', () => res.status(bres.statusCode).json(JSON.parse(data)));
    });
    reqBinance.on('error', (e) => res.status(502).json({ error: e.message }));
    reqBinance.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
};
