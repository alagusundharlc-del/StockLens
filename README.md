# StockLens — open-source stock analyzer

Search stocks, set investment preferences, and filter the market watch by six-month return and annualized volatility. Add companies to a portfolio to see profit/loss, a Monte Carlo forecast, and an AI analysis. On desktop, search and preference inputs are on the left, with matching stocks and portfolio charts on the right; the layout stacks on smaller screens.

The screener compares the market-watch stocks against historical six-month return and annualized volatility estimates. Conservative, balanced, and growth preferences set maximum volatility levels of 25%, 45%, and 80%, respectively. The minimum six-month return is adjustable, and preferences are saved in the browser. Historical performance is not a prediction of future results.

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
