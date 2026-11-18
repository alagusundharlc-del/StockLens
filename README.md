# StockLens — open-source stock analyzer

Search stocks, add 2–3 companies, see profit/loss, a Monte Carlo forecast and an AI analysis.

## Structure
```
index.html        frontend
package.json      dependencies (@google/genai)
api/stock.js      search + prices (Yahoo Finance, no key)
api/analyze.js    AI analysis (Gemini / Groq / OpenAI / Anthropic)
```

## Deploy on Vercel
1. Push this folder to GitHub, then import it in Vercel.
2. Settings → Environment Variables: add `GEMINI_API_KEY`
   (or `GROQ_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`). Optional: `AI_MODEL`.
3. Deploy.

## Run locally
```
npm install
npx vercel dev
```
Open the URL it prints. Do not open index.html directly: the /api routes need Vercel.
