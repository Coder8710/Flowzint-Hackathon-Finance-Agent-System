# Backend

FastAPI service for the Flowzint master agent.

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

## Endpoints

- `GET /health`
- `GET /search?q={query}` (Yahoo Finance dynamic autocomplete)
- `POST /analyze`

## Data Sources
- **Yahoo Finance (`yfinance`)**: Used to fetch real-time market snapshots, historical chart data, and native news fallbacks. The backend uses the latest `yfinance` with `curl_cffi` to bypass Yahoo's strict rate limits.
- **Tavily Search**: Used by the backend to actively search the web for breaking news via a dual-search strategy (pulling both fresh news and long-term analysis).

> **Note for AI Coding Assistants**: Please see [`AGENTS.md`](./AGENTS.md) for the backend AI agent architectural context.
