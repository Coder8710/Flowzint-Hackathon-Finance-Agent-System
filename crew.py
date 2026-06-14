# Flowzint Finance Agent System — crew.py — Production Ready

"""
Standalone CrewAI crew runner for the Flowzint Finance Agent System.

Provides a `run_analysis(ticker: str) -> dict` public function that:
  - Builds production agents via factory functions
  - Creates tasks with context chaining
  - Runs a sequential crew
  - Returns a merged dict of all four agent outputs under keys:
    news, fundamental, technical, sentiment
  - Handles errors with structured error dict on failure
  - Uses Python logging (no print statements)
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configure logging at module level
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def run_analysis(ticker: str) -> dict[str, Any]:
    """
    Run the four-agent CrewAI analysis for a given stock ticker.

    Args:
        ticker: Stock ticker symbol (e.g. "AAPL", "NVDA").

    Returns:
        A dict with keys: news, fundamental, technical, sentiment.
        Each value is the parsed JSON output from the respective agent.
        On failure, returns a dict with key "error" containing details.
    """
    ticker = ticker.upper().strip()
    logger.info("Starting CrewAI analysis for ticker=%s", ticker)

    try:
        # Lazy imports — only load CrewAI when actually running
        from crewai import Crew, Process
        from crewai_tools import ScrapeWebsiteTool, TavilySearchTool
        from dotenv import load_dotenv

        from app.agents.fundamental import create_fundamental_agent
        from app.agents.news import create_news_agent
        from app.agents.sentiment import create_sentiment_agent
        from app.agents.technical import create_technical_agent
        from app.tasks import (
            create_fundamental_task,
            create_news_task,
            create_sentiment_task,
            create_technical_task,
        )

        # Load environment variables
        load_dotenv()
        llm_model = os.getenv("CREWAI_MODEL", "bedrock/amazon.nova-pro-v1:0")

        # -----------------------------------------------------------------
        # Initialize tools
        # -----------------------------------------------------------------
        search_tool = TavilySearchTool()
        scrape_tool = ScrapeWebsiteTool()

        # -----------------------------------------------------------------
        # Build production agents
        # -----------------------------------------------------------------
        logger.info("Building agents with model=%s", llm_model)
        news_agent = create_news_agent(llm_model, search_tool, scrape_tool)
        fundamental_agent = create_fundamental_agent(llm_model, search_tool, scrape_tool)
        technical_agent = create_technical_agent(llm_model, search_tool)
        sentiment_agent = create_sentiment_agent(llm_model, search_tool)

        # -----------------------------------------------------------------
        # Build tasks with context chaining
        # -----------------------------------------------------------------
        news_task = create_news_task(news_agent, ticker)
        fundamental_task = create_fundamental_task(fundamental_agent, ticker, news_task)
        technical_task = create_technical_task(technical_agent, ticker, news_task)
        sentiment_task = create_sentiment_task(
            sentiment_agent, ticker, news_task, fundamental_task, technical_task
        )

        # -----------------------------------------------------------------
        # Assemble and run crew
        # -----------------------------------------------------------------
        crew = Crew(
            agents=[news_agent, fundamental_agent, technical_agent, sentiment_agent],
            tasks=[news_task, fundamental_task, technical_task, sentiment_task],
            process=Process.sequential,
            verbose=False,
            output_log_file="crew_standalone.log",
        )

        logger.info("Kicking off sequential crew for %s", ticker)
        result = crew.kickoff()
        logger.info("Crew completed for %s", ticker)

        # -----------------------------------------------------------------
        # Parse and merge results
        # -----------------------------------------------------------------
        task_outputs = result.tasks_output if hasattr(result, "tasks_output") else []

        merged: dict[str, Any] = {
            "ticker": ticker,
            "news": _safe_parse_json(str(task_outputs[0]) if len(task_outputs) > 0 else "{}"),
            "fundamental": _safe_parse_json(str(task_outputs[1]) if len(task_outputs) > 1 else "{}"),
            "technical": _safe_parse_json(str(task_outputs[2]) if len(task_outputs) > 2 else "{}"),
            "sentiment": _safe_parse_json(str(task_outputs[3]) if len(task_outputs) > 3 else "{}"),
        }

        logger.info("Analysis complete for %s — all four agents reported", ticker)
        return merged

    except Exception as exc:
        logger.exception("CrewAI analysis failed for %s: %s", ticker, exc)
        return {
            "ticker": ticker,
            "error": {
                "type": type(exc).__name__,
                "message": str(exc),
                "status": "failed",
            },
            "news": {},
            "fundamental": {},
            "technical": {},
            "sentiment": {},
        }


def _safe_parse_json(raw: str) -> dict[str, Any]:
    """Attempt to parse JSON from a raw string, handling markdown wrappers."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.removeprefix("json").strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        cleaned = cleaned[start : end + 1]

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Failed to parse JSON from agent output: %s", raw[:300])
        return {"raw_output": raw, "parse_error": True}


# ---------------------------------------------------------------------------
# CLI entry point for standalone testing
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    target = sys.argv[1] if len(sys.argv) > 1 else "AAPL"
    output = run_analysis(target)
    print(json.dumps(output, indent=2, default=str))
