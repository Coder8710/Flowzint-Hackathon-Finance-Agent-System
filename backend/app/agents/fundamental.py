# Flowzint Finance Agent System — agents/fundamental.py — Production Ready

"""
Fundamental Agent: deterministic fallback + CrewAI production-grade agent factory.

The FundamentalAnalysisAgent class provides a fast, deterministic valuation
scorer that runs without any LLM. The create_fundamental_agent() factory builds
the production CrewAI Agent with structured JSON output, memory, rate limiting,
and caching.
"""

from __future__ import annotations

import logging

from app.models.analysis import AgentFinding
from app.services.finance_data import MarketSnapshot

logger = logging.getLogger(__name__)


class FundamentalAnalysisAgent:
    """Deterministic fundamental scorer — used as fallback when CrewAI is unavailable."""

    name = "Fundamental Analysis Agent"

    async def run(self, snapshot: MarketSnapshot) -> AgentFinding:
        signals: list[str] = []
        score = 50

        if snapshot.pe_ratio is not None:
            if snapshot.pe_ratio < 22:
                signals.append(f"Valuation looks reasonable with P/E near {snapshot.pe_ratio:.1f}.")
                score += 12
            elif snapshot.pe_ratio > 45:
                signals.append(f"Premium valuation with P/E near {snapshot.pe_ratio:.1f}.")
                score -= 10
            else:
                signals.append(f"P/E near {snapshot.pe_ratio:.1f} is in a moderate range.")

        if snapshot.revenue_growth is not None:
            growth_pct = snapshot.revenue_growth * 100
            if snapshot.revenue_growth > 0.12:
                signals.append(f"Revenue growth is strong at about {growth_pct:.1f}%.")
                score += 14
            elif snapshot.revenue_growth < 0:
                signals.append(f"Revenue growth is negative at about {growth_pct:.1f}%.")
                score -= 14
            else:
                signals.append(f"Revenue growth is modest at about {growth_pct:.1f}%.")

        if snapshot.profit_margin is not None:
            margin_pct = snapshot.profit_margin * 100
            if snapshot.profit_margin > 0.18:
                signals.append(f"Profit margin is healthy at about {margin_pct:.1f}%.")
                score += 10
            elif snapshot.profit_margin < 0.06:
                signals.append(f"Profit margin is thin at about {margin_pct:.1f}%.")
                score -= 8

        if snapshot.debt_to_equity is not None:
            if snapshot.debt_to_equity > 130:
                signals.append(f"Debt-to-equity is elevated near {snapshot.debt_to_equity:.1f}.")
                score -= 8
            elif snapshot.debt_to_equity < 60:
                signals.append(f"Debt load appears manageable with debt-to-equity near {snapshot.debt_to_equity:.1f}.")
                score += 6

        score = max(0, min(100, score))
        stance = "constructive" if score >= 62 else "cautious" if score <= 42 else "balanced"

        # Calculate dynamic confidence based on available metrics
        available_metrics = 0
        if snapshot.pe_ratio is not None: available_metrics += 1
        if snapshot.revenue_growth is not None: available_metrics += 1
        if snapshot.profit_margin is not None: available_metrics += 1
        if snapshot.debt_to_equity is not None: available_metrics += 1

        confidence = 0.5 + (available_metrics * 0.1)

        # Adjust based on extreme metrics
        if snapshot.pe_ratio is not None and (snapshot.pe_ratio > 80 or snapshot.pe_ratio < 0):
            confidence -= 0.1
        if snapshot.profit_margin is not None and snapshot.profit_margin < 0:
            confidence -= 0.1

        confidence = round(max(0.4, min(0.95, confidence)), 2)

        return AgentFinding(
            agent=self.name,
            summary=f"Fundamentals look {stance} with a score of {score}/100.",
            confidence=confidence,
            signals=signals or ["Fundamental metrics were limited, so this agent used available market ratios only."],
            data={
                "score": score,
                "market_cap": snapshot.market_cap,
                "pe_ratio": snapshot.pe_ratio,
                "revenue_growth": snapshot.revenue_growth,
                "profit_margin": snapshot.profit_margin,
                "debt_to_equity": snapshot.debt_to_equity,
            },
        )


def create_fundamental_agent(llm: str, search_tool, scrape_tool) -> "Agent":
    """
    Factory: build the production CrewAI Fundamental Agent.

    Returns a crewai.Agent configured with structured JSON output,
    DCF / comps methodology, memory, rate limiting, and caching.
    """
    from crewai import Agent

    logger.info("Initializing CrewAI Fundamental Agent with model=%s", llm)
    return Agent(
        role="Lead Equity Fundamental Analyst",
        goal=(
            "Perform a deep-dive fundamental analysis on the given ticker covering valuation "
            "multiples, margin trajectories, debt levels, and overall business quality. "
            "You MUST return your findings as a single valid JSON object with exactly this schema:\n"
            "{\n"
            '  "intrinsic_value_estimate": "$X",\n'
            '  "current_price_premium_discount_pct": "X%",\n'
            '  "key_metrics": {\n'
            '    "pe_ratio": X,\n'
            '    "ev_ebitda": X,\n'
            '    "fcf_yield_pct": X,\n'
            '    "roic_pct": X,\n'
            '    "debt_to_equity": X\n'
            "  },\n"
            '  "moat_rating": "wide|narrow|none",\n'
            '  "recommendation": "buy|hold|sell|avoid"\n'
            "}\n"
            "Do NOT wrap the JSON in markdown code fences. Return ONLY the raw JSON object."
        ),
        backstory=(
            "You are a seasoned value investor and fundamental analyst reminiscent of Warren Buffett "
            "and Charlie Munger. You obsess over free cash flow, return on invested capital (ROIC), "
            "and economic moats. You do not care about short-term price movements; you only care "
            "about what the underlying business is intrinsically worth.\n\n"
            "You browse and cite specific SEC filings — 10-K annual reports, 10-Q quarterly filings, "
            "DEF 14A proxy statements, and earnings call transcripts — to find discrepancies between "
            "market price and intrinsic value. You employ DCF (Discounted Cash Flow) modeling and "
            "comparable company analysis (comps) to triangulate intrinsic value.\n\n"
            "CRITICAL: You explicitly state when specific data points are unavailable rather than "
            "hallucinating numbers. If a metric cannot be sourced, you mark it as null in the JSON "
            "and explain why in the analysis."
        ),
        llm=llm,
        tools=[search_tool, scrape_tool],
        verbose=False,
        memory=True,
        max_iter=15,
        max_rpm=10,
        cache=True,
        allow_delegation=False,
    )
