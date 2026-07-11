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
- **Data Gathering**: Agents enrich their context by pulling live financial data using `yfinance` and web-crawling with `tavily` (if configured).
- **API Surface**: It exposes a RESTful `/analyze` endpoint that accepts stock queries and returns a structured JSON payload containing the final consensus and specialist evidence.
- **For more specific details, see:** `backend/AGENTS.md`

### The Frontend (`/frontend`)
The frontend is the presentation layer, built for a high-quality user experience.
- **Tech Stack**: Next.js (TypeScript), TailwindCSS, Lucide React.
- **Core Loop**: Users input their stock query, risk tolerance, and time horizon. The Next.js app hits the backend `/analyze` endpoint, waits for the CrewAI pipeline to finish, and dynamically renders the complex report into digestible scorecards and text blocks.
- **Types**: Shared TypeScript types in `frontend/lib/types.ts` map perfectly to the Python Pydantic models in `backend/app/models/`.
- **For more specific details, see:** `frontend/AGENTS.md`

## Development Workflow for AI Agents
When writing code for this project, keep the following in mind:
1. **Separation of Concerns**: Keep AI orchestration logic in the backend and rendering logic in the frontend. Do not attempt to run LLM chains directly from the Next.js client.
2. **Type Safety**: Any change to the backend `AnalysisResponse` Pydantic model *must* be reflected in the frontend `types.ts` interfaces.
3. **Environment**: The backend requires `OPENAI_API_KEY` or `GEMINI_API_KEY` for full functionality. Ensure `.env` setups are preserved.

## Purpose of this File
If you are an AI assistant tasked with modifying this codebase, use this file to quickly grasp the project boundaries. Reference the nested `AGENTS.md` files in the `frontend` and `backend` directories for technology-specific details.
