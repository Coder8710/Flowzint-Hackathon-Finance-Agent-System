# Backend AI Agent Context

## Architecture Overview
The backend is a Python-based **FastAPI** application designed to orchestrate a multi-agent AI system for financial analysis. The core intelligence is driven by **CrewAI**, which manages a team of specialized agents to evaluate stock market data, news, and technical indicators.

## Core Technologies
- **Framework**: FastAPI (for the REST API)
- **AI Orchestration**: CrewAI
- **Data Sources**: 
  - `yfinance` (for real-time market snapshots and historical prices, plus news fallback). We utilize `yfinance>=1.4.1` with `curl_cffi` to mimic real browser TLS fingerprints, successfully bypassing Yahoo Finance's strict `429 Too Many Requests` rate limiting and bot detection.
  - `tavily` (via a dual-search strategy combining "news" and "general" topics to fetch a diverse mix of breaking headlines and long-form fundamental analysis).
- **Validation**: Pydantic

## Key Directories
- `app/agents/`: Contains the logic for the individual specialist agents (Fundamental, Technical, Sentiment, Risk, News, Portfolio, and Master). Each agent has a specific role, goal, and heuristic scoring mechanism.
- `app/crews/`: Contains `finance_crew.py`, which sets up the CrewAI process. It uses a **hierarchical process** where the `master_agent` acts as the manager, dynamically delegating tasks to sub-agents.
- `app/models/`: Defines the Pydantic models (API contracts) for requests and responses (`AnalysisRequest`, `AnalysisResponse`).
- `app/services/`: Adapters for fetching external data. `finance_data.py` attempts to fetch real-time data using `yfinance`. If Yahoo Finance is completely unavailable, it gracefully fails over to a deterministic simulation (`MarketSnapshot` fallback) to ensure the agents still receive structured metrics and the frontend charts don't break.

## Environment Variables
- `OPENAI_API_KEY` or `GEMINI_API_KEY`: Required for CrewAI to synthesize reports using LLMs.
- `TAVILY_API_KEY`: Optional; if missing, falls back to `yfinance` native news endpoint.

## Agent System Details
1. **Master Agent (Investment Committee Chair)**: The root manager in the hierarchical CrewAI process. It coordinates tasks, delegates to specialists, and synthesizes the final Buy/Hold/Sell decision into strict JSON. Prompted to heavily enforce concise 50-word summaries.
2. **Specialist Agents**:
   - **News Agent (Senior News & Macro Analyst)**: Interprets headlines for investment relevance and separates signal from noise. Equipped with web search tools to dig into breaking news.
   - **Fundamental Agent (Lead Equity Fundamental Analyst)**: Evaluates valuation multiples, ROIC, debt, and moats. Equipped with web search tools to find SEC filings.
   - **Technical Agent (Chartered Market Technician)**: Analyzes price action, moving averages, RSI, and volume profiles to judge timing risk.
   - **Sentiment Agent (Behavioral Finance Strategist)**: Tracks retail vs. institutional behavior, options flow proxy, and overall crowd euphoria/fear.
   - **Risk Agent (Chief Risk Officer)**: Focuses exclusively on capital preservation, stressing the bull thesis, finding hidden trapdoors, and identifying catastrophic scenarios. Employs a custom `_stdev` function to bypass Python 3.12/numpy floating point incompatibilities.
   - **Portfolio Agent (Private Wealth Manager)**: Fiduciary agent that ensures the investment aligns with the specific user's risk tolerance, time horizon, and existing portfolio context.

## Entry Point
- `main.py`: Exposes the `/analyze` endpoint which accepts user requests (ticker symbol, risk tolerance, horizon) and kicks off the Master Agent's analysis pipeline. It expects a pre-resolved `symbol` from the frontend autocomplete, but retains a dynamic `_extract_symbols` NLP fallback if only a raw text query is provided.
