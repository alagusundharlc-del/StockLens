// Vercel serverless function. AI provider is chosen by whichever key you set in Vercel env vars (first match wins):
// GEMINI_API_KEY | GROQ_API_KEY | OPENAI_API_KEY | ANTHROPIC_API_KEY   (optional: AI_MODEL to override the model)
const E = process.env;
const transientGeminiError = e => /\b(429|500|502|503|504)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|overload|high demand/i.test(`${e?.status || ''} ${e?.message || e}`);
const post = async (url, headers, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })).json();
const openai = (url, key, model) => async p => {
  const j = await post(url, { Authorization: 'Bearer ' + key }, { model: E.AI_MODEL || model, messages: [{ role: 'user', content: p }] });
  return j.choices?.[0]?.message?.content || JSON.stringify(j.error || j);
};
const PROVIDERS = [
  ['GEMINI_API_KEY', async p => {
    const { GoogleGenAI } = await import('@google/genai');   // official SDK, reads GEMINI_API_KEY automatically
    const ai = new GoogleGenAI({});
    const models = [...new Set([E.AI_MODEL || 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'])];
    for (let i = 0; i < models.length; i++) {
      try {
        const r = await ai.models.generateContent({ model: models[i], contents: p });
        if (!r.text) throw new Error('Gemini returned an empty response.');
        return r.text;
      } catch (e) {
        if (!transientGeminiError(e) || i === models.length - 1) throw e;
      }
    }
  }],
  ['GROQ_API_KEY', openai('https://api.groq.com/openai/v1/chat/completions', E.GROQ_API_KEY, 'llama-3.3-70b-versatile')],
  ['OPENAI_API_KEY', openai('https://api.openai.com/v1/chat/completions', E.OPENAI_API_KEY, 'gpt-4o-mini')],
  ['ANTHROPIC_API_KEY', async p => {
    const j = await post('https://api.anthropic.com/v1/messages', { 'x-api-key': E.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, { model: E.AI_MODEL || 'claude-sonnet-4-6', max_tokens: 800, messages: [{ role: 'user', content: p }] });
    return j.content?.[0]?.text || JSON.stringify(j.error || j);
  }]
];

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const prompt = `You are a quantitative stock analyst. Data below comes from applied statistics (log-return mean/volatility) and a Monte Carlo Geometric Brownian Motion simulation (2000 stochastic paths).
${JSON.stringify(req.body)}
Reply as a concise markdown report, under 180 words, using these headings:
## Current P/L
## Forecast
## Risk
## Per-stock outlook
## Risk management
Distinguish expectedPL (mean) from medianPL (median). Explain p5PL and p95PL as percentiles, never as caps, limits, guarantees, or worst/best possible outcomes. Describe probProfitPct as a probability within this simulation, not certainty.
Use short, factual paragraphs or bullets. Base outlook only on supplied statistics.
Use only the supplied data; do not invent market facts, news, causes, or correlations. Describe historical statistics as estimates, not evidence of future momentum. If diversification cannot be assessed from the data, say so.
End with "Not financial advice."`;
  const p = PROVIDERS.find(([k]) => E[k]);
  if (!p) return res.json({ text: 'No AI key found. Add GEMINI_API_KEY (or GROQ_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY) in Vercel → Settings → Environment Variables, then redeploy.' });
  try { res.json({ text: await p[1](prompt) }); } catch (e) {
    const temporarilyUnavailable = p[0] === 'GEMINI_API_KEY' && transientGeminiError(e);
    res.status(temporarilyUnavailable ? 503 : 500).json({
      text: temporarilyUnavailable ? 'Gemini is temporarily busy. Please try again shortly.' : 'AI error: ' + e.message
    });
  }
};
