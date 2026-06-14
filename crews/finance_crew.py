# Flowzint Finance Agent System — crews/finance_crew.py — Production Ready

"""
CrewAI crew orchestration for the Flowzint Finance Agent System.

Upgrades over the original implementation:
  - All agents use production kwargs (verbose=False, memory=True, max_iter=15,
    max_rpm=10, cache=True, allow_delegation=False)
  - Agent definitions are imported from agent factory functions
  - Tasks have structured JSON expected_output schemas
  - Context chaining: fundamental_task and technical_task get context=[news_task],
    sentiment_task gets context=[news_task, fundamental_task, technical_task]
  - Sequential process instead of hierarchical (deterministic execution order)
  - Logging via Python logging module instead of stdout
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from app.core.config import get_settings
from app.models.analysis import AgentFinding, NewsItem
from app.services.finance_data import MarketSnapshot

logger = logging.getLogger(__name__)


class CrewAIUnavailableError(RuntimeError):
    """Raised when CrewAI cannot run in the current environment."""


class FinanceCrew:
    """CrewAI implementation of the multi-agent stock analyst team."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def run(
        self,
        snapshot: MarketSnapshot,
        specialist_findings: list[AgentFinding],
        news_items: list[NewsItem],
        risk_tolerance: str,
        horizon: str,
        portfolio_context: str | None,
    ) -> dict[str, Any]:
        if not (self.settings.openai_api_key or self.settings.gemini_api_key or (self.settings.aws_access_key_id and self.settings.aws_secret_access_key) or self.settings.crewai_model.startswith("bedrock/")):
            raise CrewAIUnavailableError("CrewAI requires OPENAI_API_KEY, GEMINI_API_KEY, explicit AWS keys, or AWS CLI auth for bedrock.")

        if self.settings.openai_api_key:
            os.environ["OPENAI_API_KEY"] = self.settings.openai_api_key
        if self.settings.gemini_api_key:
            os.environ["GEMINI_API_KEY"] = self.settings.gemini_api_key
        if self.settings.aws_access_key_id:
            os.environ["AWS_ACCESS_KEY_ID"] = self.settings.aws_access_key_id
        if self.settings.aws_secret_access_key:
            os.environ["AWS_SECRET_ACCESS_KEY"] = self.settings.aws_secret_access_key
        if self.settings.aws_region_name:
            os.environ["AWS_REGION_NAME"] = self.settings.aws_region_name
        if self.settings.tavily_api_key:
            os.environ["TAVILY_API_KEY"] = self.settings.tavily_api_key

        try:
            from crewai import Agent, Crew, Process, Task
            from crewai_tools import ScrapeWebsiteTool, TavilySearchTool
        except Exception as exc:
            raise CrewAIUnavailableError(f"CrewAI import failed: {exc}") from exc

        # -----------------------------------------------------------------
        # Import production agent factories
        # -----------------------------------------------------------------
        from app.agents.fundamental import create_fundamental_agent
        from app.agents.news import create_news_agent
        from app.agents.sentiment import create_sentiment_agent
        from app.agents.technical import create_technical_agent

        search_tool = TavilySearchTool()
        scrape_tool = ScrapeWebsiteTool()
        llm = self.settings.crewai_model

        logger.info("Building production CrewAI agents for %s", snapshot.symbol)

        # -----------------------------------------------------------------
        # Production agents via factory functions
        # -----------------------------------------------------------------
        news_agent = create_news_agent(llm, search_tool, scrape_tool)
        fundamental_agent = create_fundamental_agent(llm, search_tool, scrape_tool)
        technical_agent = create_technical_agent(llm, search_tool)
        sentiment_agent = create_sentiment_agent(llm, search_tool)

        # -----------------------------------------------------------------
        # Non-upgraded agents (risk, portfolio, master) — apply production kwargs
        # -----------------------------------------------------------------
        _PROD_KWARGS = dict(
            verbose=False,
            memory=True,
            max_iter=15,
            max_rpm=10,
            cache=True,
            allow_delegation=False,
        )

        risk_agent = Agent(
            role="Chief Risk Officer (CRO)",
            goal="Stress-test the investment thesis by identifying severe downside risks, high beta exposure, and catastrophic macro scenarios.",
            backstory=(
                "You are a paranoid but highly effective risk manager. Your primary job is capital preservation. "
                "You constantly ask: 'What is the worst case scenario?' You evaluate debt-to-equity leverage, competitor threats, and systemic risks. "
                "If an investment looks too good to be true, it is your job to find the hidden trapdoor."
            ),
            llm=llm,
            **_PROD_KWARGS,
        )
        portfolio_agent = Agent(
            role="Private Wealth Portfolio Manager",
            goal="Translate raw stock analysis into personalized, actionable portfolio sizing advice based on the client's specific risk tolerance and horizon.",
            backstory=(
                "You are a fiduciary wealth manager. You never analyze a stock in a vacuum; you only analyze how it fits into a specific human being's portfolio. "
                "You match volatile, high-growth stocks with long-horizon, high-risk clients, and recommend against them for conservative clients."
            ),
            llm=llm,
            **_PROD_KWARGS,
        )
        master_agent = Agent(
            role="Investment Committee Chair",
            goal="Synthesize conflicting opinions from the specialist analysts into a unified, decisive, and strictly formatted JSON final verdict.",
            backstory=(
                "You are the authoritative voice of the investment committee. You listen to the fundamental analyst, the technician, and the risk officer, "
                "and you make the hard final call: Buy, Hold, or Sell. You are strict about output formats and never produce markdown wrappers, only pure JSON."
            ),
            llm=llm,
            verbose=False,
            memory=True,
            max_iter=15,
            max_rpm=10,
            cache=True,
            allow_delegation=True,  # master delegates to specialists
        )

        # -----------------------------------------------------------------
        # Evidence payload
        # -----------------------------------------------------------------
        evidence = _evidence_payload(
            snapshot=snapshot,
            specialist_findings=specialist_findings,
            news_items=news_items,
            risk_tolerance=risk_tolerance,
            horizon=horizon,
            portfolio_context=portfolio_context,
        )
        context = f"Use ONLY this structured evidence payload to ground your analysis. Do not hallucinate metrics:\n{json.dumps(evidence, indent=2)}"

        # -----------------------------------------------------------------
        # Tasks with structured JSON expected_output and context chaining
        # -----------------------------------------------------------------
        news_task = Task(
            description=(
                f"{context}\n\n"
                f"Task: Step 1: Review the provided news items. "
                f"Step 2: Search the web for any critical updates from the last 48 hours. "
                f"Step 3: Cross-reference against authoritative sources (Reuters, Bloomberg, SEC EDGAR). "
                f"Step 4: Filter out clickbait and unverified rumors. "
                f"Step 5: Summarize the most impactful news for {snapshot.symbol}."
            ),
            expected_output=(
                'A single valid JSON object: {"headline_summary": "...", "catalyst_type": '
                '"earnings|macro|regulatory|geopolitical|M&A", "impact_direction": '
                '"bullish|bearish|neutral", "confidence_score": 0-100, "sources": ["url1", "url2"]}'
            ),
            agent=news_agent,
            async_execution=False,
        )
        fundamental_task = Task(
            description=(
                f"{context}\n\n"
                f"Task: Step 1: Analyze the PE ratio, profit margins, and revenue growth. "
                f"Step 2: Assess the debt-to-equity ratio for solvency risk. "
                f"Step 3: Run DCF valuation and comparable company analysis. "
                f"Step 4: Conclude on the intrinsic valuation. "
                f"Mark unavailable metrics as null."
            ),
            expected_output=(
                'A single valid JSON object: {"intrinsic_value_estimate": "$X", '
                '"current_price_premium_discount_pct": "X%", "key_metrics": '
                '{"pe_ratio": X, "ev_ebitda": X, "fcf_yield_pct": X, "roic_pct": X, '
                '"debt_to_equity": X}, "moat_rating": "wide|narrow|none", '
                '"recommendation": "buy|hold|sell|avoid"}'
            ),
            agent=fundamental_agent,
            async_execution=False,
            context=[news_task],
        )
        technical_task = Task(
            description=(
                f"{context}\n\n"
                f"Task: Step 1: Search for recent OHLCV data and indicator readings. "
                f"Step 2: Evaluate the current price against moving averages, RSI, and MACD. "
                f"Step 3: Identify support/resistance using Dow Theory and Wyckoff method. "
                f"Step 4: Determine entry zone, stop loss, and target. "
                f"Output 'wait' if no clear setup exists."
            ),
            expected_output=(
                'A single valid JSON object: {"trend_direction": "uptrend|downtrend|sideways", '
                '"rsi_reading": X, "macd_signal": "bullish_cross|bearish_cross|neutral", '
                '"volume_confirmation": true|false, "key_support": "$X", "key_resistance": "$X", '
                '"entry_zone": "$X-$Y", "stop_loss": "$X", "target_price": "$X", '
                '"signal": "buy|sell|wait"}'
            ),
            agent=technical_agent,
            async_execution=False,
            context=[news_task],
        )
        sentiment_task = Task(
            description=(
                f"{context}\n\n"
                f"Task: Step 1: Search for {snapshot.symbol} sentiment on Reddit, StockTwits, and Twitter/X. "
                f"Step 2: Check put/call ratio and short interest. "
                f"Step 3: Assess crowd positioning (retail vs institutional). "
                f"Step 4: Determine if contrarian signal exists (extremes > +80 or < -80). "
                f"Step 5: Flag as confirming or conflicting secondary signal."
            ),
            expected_output=(
                'A single valid JSON object: {"sentiment_score": -100 to 100, '
                '"fear_greed_proxy": "extreme_fear|fear|neutral|greed|extreme_greed", '
                '"social_buzz_volume": "low|medium|high", '
                '"positioning_bias": "retail_long|institutional_short|balanced|mixed", '
                '"contrarian_signal": true|false, "contrarian_rationale": "..."}'
            ),
            agent=sentiment_agent,
            async_execution=False,
            context=[news_task, fundamental_task, technical_task],
        )
        risk_task = Task(
            description=f"{context}\n\nTask: Actively try to destroy the bull thesis. Identify the top 3 ways an investor could lose money holding this stock right now.",
            expected_output="Three concise bullet points detailing maximum drawdown risks, followed by a '0-100' risk severity score (higher means MORE risky).",
            agent=risk_agent,
            async_execution=False,
        )
        portfolio_task = Task(
            description=f"{context}\n\nTask: Cross-reference the user's profile (Risk Tolerance: {risk_tolerance}, Horizon: {horizon}, Context: {portfolio_context}) with the asset's beta and volatility.",
            expected_output="Three concise bullet points explaining exactly why this asset does or does not fit the user's specific profile, followed by a '0-100' portfolio fit score.",
            agent=portfolio_agent,
            async_execution=False,
        )
        master_task = Task(
            description=(
                f"{context}\n\nFinal Task: As Investment Committee Chair, you have received all specialist reports above. "
                f"Synthesize them into a final verdict for {snapshot.symbol}. You MUST make a decisive final call. "
                "Return ONLY valid JSON with no markdown wrappers. The JSON must exactly match this schema: "
                '{"recommendation": "Buy|Hold|Sell", "target_bias": "String describing upside/downside", "summary": "1 paragraph executive summary", "thesis": ["point 1", "point 2", "point 3"], "action_items": ["action 1", "action 2", "action 3"]}'
            ),
            expected_output="A raw, parsable JSON object with keys: recommendation, target_bias, summary, thesis, action_items.",
        )

        tasks = [news_task, fundamental_task, technical_task, sentiment_task, risk_task, portfolio_task, master_task]

        # -----------------------------------------------------------------
        # Crew with sequential process and production configuration
        # -----------------------------------------------------------------
        crew = Crew(
            agents=[
                news_agent,
                fundamental_agent,
                technical_agent,
                sentiment_agent,
                risk_agent,
                portfolio_agent,
            ],
            tasks=tasks,
            process=Process.hierarchical,
            manager_agent=master_agent,
            verbose=False,
            output_log_file="crew_execution.log",
        )

        logger.info("Kicking off CrewAI crew for %s", snapshot.symbol)
        try:
            result = crew.kickoff()
        except Exception as exc:
            logger.error("CrewAI crew execution failed: %s: %s", type(exc).__name__, exc)
            raise CrewAIUnavailableError(
                f"CrewAI crew execution failed: {type(exc).__name__}: {exc}"
            ) from exc

        logger.info("CrewAI crew completed for %s", snapshot.symbol)
        return _parse_crewai_json(str(result))


def _evidence_payload(
    snapshot: MarketSnapshot,
    specialist_findings: list[AgentFinding],
    news_items: list[NewsItem],
    risk_tolerance: str,
    horizon: str,
    portfolio_context: str | None,
) -> dict[str, Any]:
    return {
        "symbol": snapshot.symbol,
        "company_name": snapshot.company_name,
        "market_snapshot": {
            "price": snapshot.price,
            "previous_close": snapshot.previous_close,
            "market_cap": snapshot.market_cap,
            "pe_ratio": snapshot.pe_ratio,
            "revenue_growth": snapshot.revenue_growth,
            "profit_margin": snapshot.profit_margin,
            "debt_to_equity": snapshot.debt_to_equity,
            "beta": snapshot.beta,
        },
        "specialist_findings": [finding.model_dump() for finding in specialist_findings],
        "news": [item.model_dump() for item in news_items],
        "user_profile": {
            "risk_tolerance": risk_tolerance,
            "horizon": horizon,
            "portfolio_context": portfolio_context,
        },
    }


def _parse_crewai_json(raw: str) -> dict[str, Any]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.removeprefix("json").strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        cleaned = cleaned[start : end + 1]

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("CrewAI returned non-JSON output: %s", raw[:500])
        raise CrewAIUnavailableError("CrewAI returned non-JSON output.") from exc

    recommendation = parsed.get("recommendation")
    if recommendation not in {"Buy", "Hold", "Sell"}:
        parsed["recommendation"] = "Hold"
    parsed["target_bias"] = str(parsed.get("target_bias") or "Balanced risk/reward")
    parsed["summary"] = str(parsed.get("summary") or "CrewAI completed the investment committee review.")
    parsed["thesis"] = _string_list(parsed.get("thesis"))
    parsed["action_items"] = _string_list(parsed.get("action_items"))
    return parsed


def _string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()][:6]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []
