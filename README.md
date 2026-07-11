# Flowzint Finance AI

Multi-agent AI finance assistant for analyzing stocks and companies with market data, technical indicators, news, sentiment, risk scoring, and portfolio-fit guidance.

## What Is Built

- **Frontend:** Next.js, React, TailwindCSS analysis console.
- **Backend:** FastAPI API with a CrewAI master agent and six specialist agents.
- **Agents:** News, fundamentals, technicals, sentiment, risk, and portfolio advisor (using deep prompt engineering to simulate a professional investment committee).
- **AI Framework:** CrewAI coordinates the specialist agents for final report synthesis when an LLM key is configured.
- **Data:** Uses `yfinance` for core metrics and news fallback, with Tavily support (dual-search strategy) for richer real-time news when an API key is configured.
- **Output:** Buy/Hold/Sell suggestion, agent evidence, risk score, thesis, action items, and recent headlines.

## Project Structure

```text
backend/
  app/
    agents/       # Master and specialist agents
    crews/        # CrewAI crew definitions
    core/         # Settings
    models/       # API contracts
    services/     # Finance and news data adapters
frontend/
  app/            # Next.js app router
  components/     # Report UI components
  lib/            # API client and shared types
```

> **Note for AI Coding Assistants**: Please see [`AGENTS.md`](./AGENTS.md) for the global AI agent architectural context.

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

## Frontend Setup

```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

The app will be available at `http://localhost:3000`.

## Environment Variables

Backend:

- `TAVILY_API_KEY`: optional, enables richer real-time finance news search.
- `OPENAI_API_KEY`: reserved for future LLM summarization.
- `GEMINI_API_KEY`: optional alternative LLM key for CrewAI-backed synthesis.
- `CREWAI_MODEL`: model used by CrewAI, default `amazon nova pro`.
- `CORS_ORIGINS`: comma-separated frontend origins.

Frontend:

- `NEXT_PUBLIC_API_URL`: backend URL, default `http://localhost:8000`.

## Example Queries

- `Analyze NVIDIA stock`
- `Should I invest in Tesla?`
- `Compare Apple vs Microsoft`
- `Analyze AMD and NVDA`

## API

### `GET /search?q={query}`
Returns a list of matching company tickers from Yahoo Finance to power the frontend autocomplete.

### `POST /analyze`

```json
{
  "query": "Analyze Apollo Hospitals",
  "symbol": "APOLLOHOSP.NS",
  "company_name": "Apollo Hospitals Enterprise Limited",
  "risk_tolerance": "medium",
  "horizon": "long",
  "portfolio_context": "I already hold large-cap tech."
}
```

Returns a master-agent summary plus one report per detected ticker. The `symbol` and `company_name` fields are used to bypass backend query NLP parsing for perfect accuracy.

## Notes

This is research support, not financial advice. Live data depends on upstream providers and API availability. If live requests or CrewAI credentials are unavailable, the backend returns deterministic fallback analysis so the demo remains usable offline.
