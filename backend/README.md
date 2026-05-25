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

> **Note for AI Coding Assistants**: Please see [`AGENTS.md`](./AGENTS.md) for the backend AI agent architectural context.
