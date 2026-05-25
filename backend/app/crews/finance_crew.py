from __future__ import annotations

import json
import os
from typing import Any

from app.core.config import get_settings
from app.models.analysis import AgentFinding, NewsItem
from app.services.finance_data import MarketSnapshot


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
        if not (self.settings.openai_api_key or self.settings.gemini_api_key):
            raise CrewAIUnavailableError("CrewAI requires OPENAI_API_KEY or GEMINI_API_KEY.")

        if self.settings.openai_api_key:
            os.environ["OPENAI_API_KEY"] = self.settings.openai_api_key
        if self.settings.gemini_api_key:
            os.environ["GEMINI_API_KEY"] = self.settings.gemini_api_key

        try:
            from crewai import Agent, Crew, Process, Task
            from crewai_tools import ScrapeWebsiteTool
            from app.tools.search_tools import TavilySearchTool
        except Exception as exc:
            raise CrewAIUnavailableError(f"CrewAI import failed: {exc}") from exc
            
        search_tool = TavilySearchTool()
        scrape_tool = ScrapeWebsiteTool()

        llm = self.settings.crewai_model
        evidence = _evidence_payload(
            snapshot=snapshot,
            specialist_findings=specialist_findings,
            news_items=news_items,
            risk_tolerance=risk_tolerance,
            horizon=horizon,
            portfolio_context=portfolio_context,
        )

        news_agent = Agent(
            role="Senior News & Macro Events Analyst",
            goal="Analyze real-time breaking news, corporate announcements, and macro-economic shifts to determine immediate and short-term price catalysts.",
            backstory=(
                "You are an elite financial journalist and macro analyst who separates high-conviction signals from market noise. "
                "You have a deep understanding of how regulatory shifts, earnings surprises, and geopolitical events impact equities. "
                "You use web search tools relentlessly to trace the origin of market rumors and confirm factual corporate developments."
            ),
            llm=llm,
            verbose=False,
            allow_delegation=False,
            tools=[search_tool, scrape_tool],
        )
        fundamental_agent = Agent(
            role="Lead Equity Fundamental Analyst",
            goal="Perform deep-dive analysis on valuation multiples, margin trajectories, debt levels, and overall business quality.",
            backstory=(
                "You are a seasoned value investor and fundamental analyst reminiscent of Warren Buffett. "
                "You obsess over free cash flow, return on invested capital (ROIC), and economic moats. "
                "You do not care about short-term price movements; you only care about what the underlying business is intrinsically worth. "
                "You browse SEC filings and earnings call transcripts to find discrepancies between market price and intrinsic value."
            ),
            llm=llm,
            verbose=False,
            allow_delegation=False,
            tools=[search_tool, scrape_tool],
        )
        technical_agent = Agent(
            role="Chartered Market Technician (CMT)",
            goal="Identify optimal entry and exit points by analyzing price action, moving averages, momentum oscillators, and volume profiles.",
            backstory=(
                "You are a disciplined quantitative and technical trader. You believe that price is truth. "
                "You look for convergence/divergence in RSI, MACD crosses, and key psychological support/resistance levels. "
                "Your objective is to assess the current market trend and judge the timing risk of initiating a position today."
            ),
            llm=llm,
            verbose=False,
            allow_delegation=False,
        )
        sentiment_agent = Agent(
            role="Behavioral Finance & Sentiment Strategist",
            goal="Measure fear, greed, and crowd positioning by analyzing social media tone, options flow proxy, and retail vs. institutional behavior.",
            backstory=(
                "You are an expert in behavioral economics. You know that markets are driven by human emotion just as much as numbers. "
                "You track whether the market is overly euphoric or deeply pessimistic regarding the asset, looking for contrarian opportunities."
            ),
            llm=llm,
            verbose=False,
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
            verbose=False,
            allow_delegation=False,
        )
        portfolio_agent = Agent(
            role="Private Wealth Portfolio Manager",
            goal="Translate raw stock analysis into personalized, actionable portfolio sizing advice based on the client's specific risk tolerance and horizon.",
            backstory=(
                "You are a fiduciary wealth manager. You never analyze a stock in a vacuum; you only analyze how it fits into a specific human being's portfolio. "
                "You match volatile, high-growth stocks with long-horizon, high-risk clients, and recommend against them for conservative clients."
            ),
            llm=llm,
            verbose=False,
            allow_delegation=False,
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
            allow_delegation=True,
        )

        context = f"Use ONLY this structured evidence payload to ground your analysis. Do not hallucinate metrics:\n{json.dumps(evidence, indent=2)}"
        tasks = [
            Task(
                description=f"{context}\n\nTask: Step 1: Review the provided news items. Step 2: Search the web for any critical updates from the last 24 hours. Step 3: Summarize the most impactful news for {snapshot.symbol}.",
                expected_output="Three concise bullet points detailing the most critical news and macro impacts, followed by a '0-100' news conviction score.",
                agent=news_agent,
            ),
            Task(
                description=f"{context}\n\nTask: Step 1: Analyze the PE ratio, profit margins, and revenue growth. Step 2: Assess the debt-to-equity ratio for solvency risk. Step 3: Conclude on the intrinsic valuation.",
                expected_output="Three concise bullet points summarizing valuation, growth, and balance sheet health, followed by a '0-100' fundamental score.",
                agent=fundamental_agent,
            ),
            Task(
                description=f"{context}\n\nTask: Evaluate the current price against its previous close and historical context to determine short-term trend and timing risk.",
                expected_output="Three concise bullet points detailing price momentum and timing risk, followed by a '0-100' technical score.",
                agent=technical_agent,
            ),
            Task(
                description=f"{context}\n\nTask: Read the news tone and market snapshot to infer whether the crowd is euphoric, neutral, or fearful regarding this asset.",
                expected_output="Three concise bullet points assessing retail and institutional sentiment, followed by a '0-100' sentiment score.",
                agent=sentiment_agent,
            ),
            Task(
                description=f"{context}\n\nTask: Actively try to destroy the bull thesis. Identify the top 3 ways an investor could lose money holding this stock right now.",
                expected_output="Three concise bullet points detailing maximum drawdown risks, followed by a '0-100' risk severity score (higher means MORE risky).",
                agent=risk_agent,
            ),
            Task(
                description=f"{context}\n\nTask: Cross-reference the user's profile (Risk Tolerance: {risk_tolerance}, Horizon: {horizon}, Context: {portfolio_context}) with the asset's beta and volatility.",
                expected_output="Three concise bullet points explaining exactly why this asset does or does not fit the user's specific profile, followed by a '0-100' portfolio fit score.",
                agent=portfolio_agent,
            ),
            Task(
                description=(
                    f"{context}\n\nTask: As Committee Chair, review all specialist findings. You MUST make a final decision. "
                    "Return valid JSON ONLY. DO NOT wrap the JSON in ```json blocks. The JSON must exactly match this schema: "
                    '{"recommendation": "Buy|Hold|Sell", "target_bias": "String describing upside/downside", "summary": "1 paragraph executive summary", "thesis": ["point 1", "point 2", "point 3"], "action_items": ["action 1", "action 2", "action 3"]}'
                ),
                expected_output="A raw, parsable JSON object containing the final investment committee decision with keys: recommendation, target_bias, summary, thesis, action_items.",
                agent=master_agent,
            ),
        ]

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
        )
        result = crew.kickoff()
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
