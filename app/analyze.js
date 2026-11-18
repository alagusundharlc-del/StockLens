// AI provider is chosen by whichever key you set in Vercel env vars (first match wins):
// GEMINI_API_KEY | GROQ_API_KEY | OPENAI_API_KEY | ANTHROPIC_API_KEY   (optional: AI_MODEL to override the model)
const E = process.env;
const post = async (url, headers, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })).json();
const openai = (url, key, model) => async p => {
  const j = await post(url, { Authorization: 'Bearer ' + key }, { model: E.AI_MODEL || model, messages: [{ role: 'user', content: p }] });
  return j.choices?.[0]?.message?.content || JSON.stringify(j.error || j);
};
const PROVIDERS = [
  ['GEMINI_API_KEY', async p => {
    const { GoogleGenAI } = await import('@google/genai');   // official SDK, reads GEMINI_API_KEY automatically
    const ai = new GoogleGenAI({});
    const r = await ai.models.generateContent({ model: E.AI_MODEL || 'gemini-flash-latest', contents: p });
    return r.text;
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
Reply in concise markdown, under 220 words:
1) Current profit/loss with percentages
2) Predicted profit/loss: interpret probability of profit, expected value and the 5th–95th percentile range
3) Risk: volatility and diversification
4) Per-stock outlook (Bullish/Neutral/Bearish + one-line reason)
5) One suggestion
End with "Not financial advice."`;
  const p = PROVIDERS.find(([k]) => E[k]);
  if (!p) return res.json({ text: 'No AI key found. Add GEMINI_API_KEY (or GROQ_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY) in Vercel → Settings → Environment Variables, then redeploy.' });
  try { res.json({ text: await p[1](prompt) }); } catch (e) { res.status(500).json({ text: 'AI error: ' + e.message }); }
};
