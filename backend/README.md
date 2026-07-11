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
- `POST /analyze`

## Data Sources
- **Yahoo Finance (`yfinance`)**: Used to fetch real-time market snapshots and historical chart data. The backend uses the latest `yfinance` with `curl_cffi` to bypass Yahoo's strict rate limits.
- **Tavily Search**: Used by the CrewAI agents to actively search the web for breaking news and qualitative context.

> **Note for AI Coding Assistants**: Please see [`AGENTS.md`](./AGENTS.md) for the backend AI agent architectural context.
