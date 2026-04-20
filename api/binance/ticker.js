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
