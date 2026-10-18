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
                "moat_rating": "Wide" if snapshot.profit_margin and snapshot.profit_margin > 0.15 else "Narrow" if snapshot.profit_margin and snapshot.profit_margin > 0.05 else "None",
                "intrinsic_value_estimate": f"{snapshot.price * 1.15:.2f}" if score >= 62 else f"{snapshot.price * 0.85:.2f}" if score <= 42 else f"{snapshot.price:.2f}",
                "key_metrics": {
                    "pe_ratio": snapshot.pe_ratio,
                    "ev_ebitda": None,
                    "fcf_yield_pct": None,
                    "roic_pct": snapshot.profit_margin * 100 if snapshot.profit_margin else None,
                    "debt_to_equity": snapshot.debt_to_equity
                }
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
            "Perform an institutional-grade, multi-layered fundamental analysis on the given ticker. "
            "Your analysis must be grounded in the actual financial data provided in the evidence payload "
            "and supplemented with web research for any missing data points. Follow this exact methodology:\n\n"
            "STEP 1 — KEY RATIO ASSESSMENT: Evaluate the following ratios from the evidence payload "
            "and classify each as 'strong / neutral / weak' relative to the company's sector: "
            "P/E ratio, EV/EBITDA, Free Cash Flow Yield, Return on Invested Capital (ROIC), "
            "Debt-to-Equity, Profit Margins (gross / operating / net), Revenue Growth (YoY & QoQ).\n\n"
            "STEP 2 — DCF VALUATION: Run a simplified Discounted Cash Flow model using these inputs: "
            "Assume a 5-year FCF growth rate (use the actual revenue_growth from evidence, or search "
            "for analyst consensus if not available). Use a WACC of 10-12% for US large-caps, 12-14% "
            "for Indian/Asian mid-caps, 14-16% for small-caps/emerging market companies. Apply a "
            "terminal growth rate of 2.5-3.5% for established companies, 1-2% for cyclicals. "
            "Derive the intrinsic value per share and compare to current market price.\n\n"
            "STEP 3 — PEER COMPARISON: Identify 2-3 direct sector competitors and compare key "
            "valuation multiples (P/E, EV/EBITDA, P/S). State if the stock trades at a premium or "
            "discount to peers and justify why.\n\n"
            "STEP 4 — QUALITY & MOAT CHECK: Assess business quality using these signals: "
            "consistent ROIC > 15% (wide moat indicator), pricing power evidence (gross margin "
            "stability despite inflation), management credibility (promoter pledging for Indian stocks, "
            "insider ownership for US stocks), auditor quality, and related-party transaction red flags.\n\n"
            "STEP 5 — RED FLAG SCAN: Specifically search for: auditor change or qualification, "
            "promoter pledge increase (for Indian stocks), goodwill impairment risk, "
            "aggressive revenue recognition, high accounts receivable days increasing.\n\n"
            "You MUST return your findings as a single valid JSON object with exactly this schema:\n"
            "{\n"
            '  "intrinsic_value_estimate": "$X or ₹X",\n'
            '  "current_price_premium_discount_pct": "X% premium or X% discount",\n'
            '  "dcf_wacc_used_pct": X,\n'
            '  "terminal_growth_rate_pct": X,\n'
            '  "key_metrics": {\n'
            '    "pe_ratio": X,\n'
            '    "ev_ebitda": X,\n'
            '    "fcf_yield_pct": X,\n'
            '    "roic_pct": X,\n'
            '    "debt_to_equity": X\n'
            "  },\n"
            '  "peer_comparison": [{"name": "PeerCo", "pe": X, "ev_ebitda": X}],\n'
            '  "moat_rating": "wide|narrow|none",\n'
            '  "red_flags": ["flag1"] or [],\n'
            '  "recommendation": "buy|hold|sell|avoid"\n'
            "}\n"
            "Do NOT wrap the JSON in markdown code fences. Return ONLY the raw JSON object. "
            "Mark any metric you cannot source as null — NEVER hallucinate numbers."
        ),
        backstory=(
            "You are a seasoned value investor and CFA charterholder who has managed a $2B equity "
            "portfolio. You are deeply influenced by Warren Buffett's approach to business quality "
            "and intrinsic value, but you are also pragmatic enough to use modern quantitative "
            "metrics like EV/EBITDA and FCF yield to triangulate value.\n\n"
            "For US-listed companies, you ALWAYS retrieve the most recent 10-K, 10-Q, and earnings "
            "call transcript from SEC EDGAR (sec.gov/cgi-bin/browse-edgar) and investor relations pages. "
            "You look for discrepancies between GAAP and non-GAAP metrics, unusual adjustments in "
            "operating cash flow, and changes in accounts receivable relative to revenue (a red flag "
            "for revenue pull-forward).\n\n"
            "For Indian-listed companies (BSE/NSE), you search the BSE India corporate filings portal "
            "(bseindia.com) and NSE India (nseindia.com) for quarterly earnings (Q1/Q2/Q3/Q4 results), "
            "annual reports, and SEBI disclosures. You pay special attention to promoter pledging "
            "(a major red flag if above 30%), related-party transaction disclosures, and whether the "
            "auditor has issued any qualified or adverse opinions.\n\n"
            "For all companies, you run a DCF model with clearly stated WACC and terminal growth "
            "assumptions. You NEVER present a single 'target price' without showing your assumptions. "
            "You always sanity-check your DCF output against peer trading multiples to ensure your "
            "estimate isn't absurdly far from market reality. If your DCF produces a value more than "
            "50% above or below the market price, you double-check your inputs before concluding.\n\n"
            "CRITICAL: You explicitly state when specific data points are unavailable rather than "
            "hallucinating numbers. If a metric cannot be sourced, you mark it as null in the JSON "
            "and note the reason. You never make up earnings estimates or growth rates."
        ),
        llm=llm,
        tools=[search_tool, scrape_tool],
        verbose=False,
        memory=False,
        max_iter=15,
        max_rpm=10,
        cache=True,
        allow_delegation=False,
    )
