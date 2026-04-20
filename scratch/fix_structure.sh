#!/bin/bash
set -e

# 1. Clean up and setup API folder
rm -rf api
mkdir -p api/binance

# 2. Write the Ticker Proxy
cat > api/binance/ticker.js << 'EOF'
const https = require('https');
const BINANCE_FAPI = process.env.BINANCE_TESTNET === 'true' ? 'https://testnet.binancefuture.com' : 'https://fapi.binance.com';
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const symbol = req.query.symbol;
    const url = symbol ? `${BINANCE_FAPI}/fapi/v1/ticker/24hr?symbol=${symbol}` : `${BINANCE_FAPI}/fapi/v1/ticker/24hr`;
    https.get(url, (bres) => {
      let data = '';
      bres.on('data', (d) => data += d);
      bres.on('end', () => res.status(200).json(JSON.parse(data)));
    }).on('error', (e) => res.status(502).json({ error: e.message }));
  } catch (err) { res.status(500).json({ error: err.message }); }
};
EOF

# 3. Write Symbol Price Proxy (Ping/Price)
cat > api/binance/price.js << 'EOF'
const https = require('https');
const BINANCE_FAPI = process.env.BINANCE_TESTNET === 'true' ? 'https://testnet.binancefuture.com' : 'https://fapi.binance.com';
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const symbol = req.query.symbol || 'BTCUSDT';
  https.get(`${BINANCE_FAPI}/fapi/v1/ticker/price?symbol=${symbol}`, (bres) => {
    let data = '';
    bres.on('data', (d) => data += d);
    bres.on('end', () => res.status(200).json(JSON.parse(data)));
  }).on('error', (e) => res.status(502).json({ error: e.message }));
};
EOF

# 4. Write Signed Order Proxy
cat > api/binance/order.js << 'EOF'
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
EOF

# 5. Correct vercel.json
cat > vercel.json << 'EOF'
{
  "version": 2,
  "framework": "create-react-app",
  "buildCommand": "npm install --legacy-peer-deps && npm run build",
  "outputDirectory": "build",
  "rewrites": [
    { "source": "/api/binance/:path*", "destination": "/api/binance/:path*" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
EOF

echo "Project restructured and API files recreated."
