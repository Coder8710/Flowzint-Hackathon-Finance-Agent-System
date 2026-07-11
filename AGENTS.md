# Flowzint Finance AI - Global Agent Context

This document serves as the top-level context for AI coding tools working in the **Flowzint Finance AI** repository. It outlines the project's holistic architecture, connecting the frontend and backend.

## System Architecture

The system is a full-stack web application designed to act as a multi-agent AI finance assistant. It analyzes stocks and companies by synthesizing market data, technical indicators, news sentiment, and risk scoring.

The repository is organized into a monorepo structure with two distinct boundaries:
- `backend/`: A FastAPI Python server powered by CrewAI.
- `frontend/`: A Next.js (App Router) React web application.

### The Backend (`/backend`)
The backend is the brain of the operation. It relies heavily on **CrewAI** to orchestrate a team of LLM-powered agents, utilizing deep prompt engineering to simulate a realistic investment committee.
- **Hierarchical Process**: The backend utilizes an `Investment Committee Chair` (master agent) acting as the manager to delegate research tasks to six specialist agents (News & Macro, Fundamental, CMT Technical, Sentiment Strategist, Chief Risk Officer, Private Wealth Manager).
- **Strict Constraints**: Agents are heavily prompted to be concise (e.g., 50-word limits) and to output strict JSON schemas without Markdown wrappers to ensure seamless parsing.
- **Data Gathering**: Agents enrich their context by pulling live financial data using `yfinance` (with `curl_cffi` for rate limit evasion) and web-crawling with `tavily` (using a dual-search strategy for both breaking news and deep-dive analysis).
- **API Surface**: It exposes a RESTful `/analyze` endpoint that accepts stock queries (and pre-resolved tickers) and returns a structured JSON payload containing the final verdict and specialist evidence. It also exposes `/search` for ticker autocomplete.
- **For more specific details, see:** `backend/AGENTS.md`

### The Frontend (`/frontend`)
The frontend is the presentation layer, built for a high-quality user experience with responsive, glassmorphic design and dark/light modes.
- **Tech Stack**: Next.js (TypeScript), TailwindCSS, Lucide React.
- **Core Loop**: Users search for a company using the "Quick Company Search" autocomplete, which resolves the exact ticker (e.g., `APOLLOHOSP.NS`). Along with risk tolerance and time horizon, this exact symbol is sent to the `/analyze` endpoint (disabling the text-query fallback). The UI waits for the CrewAI pipeline to finish (displaying a deterministic agent timeline slider), and dynamically renders the complex report into digestible scorecards and text blocks.
- **Dynamic Styling**: Components like `MetricBar` use inline CSS gradients and transitions to ensure animations work reliably without Tailwind JIT dropping dynamic classes.
- **Types**: Shared TypeScript types in `frontend/lib/types.ts` map perfectly to the Python Pydantic models in `backend/app/models/`.
- **For more specific details, see:** `frontend/AGENTS.md`

## Development Workflow for AI Agents
When writing code for this project, keep the following in mind:
1. **Separation of Concerns**: Keep AI orchestration logic in the backend and rendering logic in the frontend. Do not attempt to run LLM chains directly from the Next.js client.
2. **Type Safety**: Any change to the backend `AnalysisResponse` or `AnalysisRequest` Pydantic models *must* be reflected in the frontend `types.ts` interfaces.
3. **Environment**: The backend requires `OPENAI_API_KEY` or `GEMINI_API_KEY` for full functionality. Ensure `.env` setups are preserved.

## Purpose of this File
If you are an AI assistant tasked with modifying this codebase, use this file to quickly grasp the project boundaries. Reference the nested `AGENTS.md` files in the `frontend` and `backend` directories for technology-specific details.
