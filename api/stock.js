// Vercel serverless function for Yahoo Finance endpoints (unofficial, no key).
const H = { 'User-Agent': 'Mozilla/5.0' };
const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const yf = async path => { for (const h of HOSTS) { try { const r = await fetch(h + path, { headers: H }); if (r.ok) return await r.json(); } catch {} } throw new Error('Yahoo unavailable'); };

module.exports = async (req, res) => {
  const { q, symbols } = req.query;
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
  try {
    if (q) {
      const j = await yf(`/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`);
      return res.json((j.quotes || []).filter(x => x.symbol).map(x => ({ symbol: x.symbol, name: x.shortname || x.longname || x.symbol })));
    }
    const list = (symbols || '').split(',').filter(Boolean).slice(0, 20);
    const out = await Promise.all(list.map(async s => {
      try {
        const j = await yf(`/v8/finance/chart/${encodeURIComponent(s)}?range=6mo&interval=1d`);
        const m = j.chart.result[0], c = (m.indicators.quote[0].close || []).filter(Boolean);
        return { symbol: s, name: m.meta.shortName || m.meta.longName || s, price: m.meta.regularMarketPrice,
                 prev: c[c.length - 2] ?? m.meta.chartPreviousClose, currency: m.meta.currency, closes: c.map(x => +x.toFixed(2)) };
      } catch { return { symbol: s, error: true }; }
    }));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
