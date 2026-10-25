from app.models.analysis import AgentFinding
import logging

logger = logging.getLogger(__name__)


class PortfolioAdvisorAgent:
    name = "Portfolio Advisor Agent"

    async def run(
        self,
        symbol: str,
        risk_tolerance: str,
        horizon: str,
        risk_score: int,
        portfolio_context: str | None,
    ) -> AgentFinding:
        signals: list[str] = []
        rationale: list[str] = []
        score = 55
        concentration_warning = False
        concentration_note = None

        # ── Risk profile alignment ──────────────────────────────────────
        if risk_tolerance == "low" and risk_score > 55:
            signals.append(f"{symbol} risk score ({risk_score}/100) exceeds low-risk profile threshold. Consider a smaller starter position.")
            rationale.append(f"Risk score of {risk_score} is too high for a conservative low-risk portfolio — only stocks below 40 are suitable.")
            score -= 16
        elif risk_tolerance == "high" and risk_score < 75:
            signals.append(f"{symbol} risk level is manageable for a high-risk tolerance profile (score {risk_score}/100).")
            rationale.append(f"High-risk client can accommodate stocks up to risk score 80. At {risk_score}, this stock fits the profile with room for a meaningful position.")
            score += 8
        else:
            signals.append(f"{symbol} broadly matches a {risk_tolerance}-risk profile with risk score {risk_score}/100.")
            rationale.append(f"Stock risk score of {risk_score} aligns with medium-risk tolerance bands (30-65). Suitable for inclusion.")

        # ── Horizon alignment ───────────────────────────────────────────
        if horizon == "long":
            signals.append("Long investment horizon (3+ years) can absorb short-term volatility in growth stocks.")
            rationale.append("A 3+ year horizon is optimal for fundamental compounders — short-term noise becomes irrelevant.")
            score += 6
            horizon_alignment = "well_aligned"
        elif horizon == "short" and risk_score > 50:
            signals.append("Short horizon (<1 year) with elevated risk score increases timing risk significantly.")
            rationale.append("Short-term trades in volatile stocks require precise entry/exit. Consider only technically-driven setup.")
            score -= 8
            horizon_alignment = "partially_aligned"
        else:
            horizon_alignment = "well_aligned"

        # ── Portfolio context analysis ───────────────────────────────────
        context_lower = (portfolio_context or "").lower()
        has_context = bool(portfolio_context and portfolio_context.strip())

        if has_context:
            signals.append(f"Portfolio context analyzed for concentration and sector fit.")

            # Detect tech overweight
            tech_keywords = ["tech", "technology", "aapl", "msft", "nvda", "meta", "googl", "amazon", "software"]
            is_tech_heavy = any(kw in context_lower for kw in tech_keywords)
            if is_tech_heavy and symbol in {"NVDA", "AAPL", "MSFT", "GOOGL", "META", "AMZN"}:
                concentration_warning = True
                concentration_note = f"Adding {symbol} to a tech-heavy portfolio may push sector concentration above 40%. Consider reducing to a starter position (1-2%) to manage concentration risk."
                rationale.append(f"Tech concentration risk detected. Portfolio already overweight tech; {symbol} would amplify sector exposure.")
                score -= 5
            elif is_tech_heavy:
                signals.append(f"{symbol} is a non-tech position — may improve sector diversification in your tech-heavy portfolio.")
                rationale.append("Non-tech exposure helps balance a tech-heavy portfolio. This addition improves diversification.")
                score += 4

            # Detect bond/defensive portfolio
            if any(kw in context_lower for kw in ["bond", "dividend", "defensive", "retired", "income", "conservative"]):
                if risk_score > 55:
                    signals.append(f"{symbol} is growth-oriented and may not suit a defensive/income-focused portfolio context.")
                    score -= 6
                else:
                    signals.append(f"{symbol} has relatively contained risk and can complement a defensive portfolio.")

            # Detect cash availability
            if any(kw in context_lower for kw in ["cash", "liquid", "underinvested"]):
                signals.append("Cash availability noted — staged entry over 2-3 tranches is recommended to average cost.")

        # ── Position sizing using fixed-fractional method ────────────────
        if risk_score < 40:
            alloc_lo, alloc_hi = 5, 10
            entry_strategy = "full_position"
        elif risk_score < 65:
            alloc_lo, alloc_hi = 3, 7
            entry_strategy = "staged_3_tranches"
        else:
            alloc_lo, alloc_hi = 1, 3
            entry_strategy = "starter_position"

        if concentration_warning:
            alloc_hi = max(1, alloc_hi - 2)
            alloc_lo = max(1, alloc_lo - 1)

        allocation_pct_range = f"{alloc_lo}%-{alloc_hi}%"
        allocation_advice = (
            f"Suggested allocation: {allocation_pct_range} of portfolio using {entry_strategy.replace('_', ' ')} strategy. "
            f"Risk score {risk_score}/100 with {risk_tolerance} risk tolerance and {horizon} horizon. "
            f"{'Concentration risk flagged — reduce position size. ' if concentration_warning else ''}"
            f"{concentration_note or ''}"
        ).strip()

        # ── Rebalancing trigger ──────────────────────────────────────────
        rebalancing_trigger = (
            f"Exit or reduce if risk_score rises above 75, or if {symbol} drops more than 15% from entry "
            f"without a corresponding improvement in fundamentals. Review on next quarterly earnings."
        )

        score = max(0, min(100, score))

        return AgentFinding(
            agent=self.name,
            summary=f"Portfolio fit score: {score}/100. Recommended allocation: {allocation_pct_range} via {entry_strategy.replace('_', ' ')} entry.",
            confidence=0.62,
            signals=signals,
            data={
                "score": score,
                "fit_score": score,
                "risk_tolerance": risk_tolerance,
                "horizon": horizon,
                "allocation_advice": allocation_advice,
                "entry_strategy": entry_strategy,
                "suggested_allocation_pct_range": allocation_pct_range,
                "horizon_alignment": horizon_alignment,
                "concentration_warning": concentration_warning,
                "concentration_note": concentration_note,
                "rebalancing_trigger": rebalancing_trigger,
                "rationale": rationale,
            },
        )



def create_portfolio_agent(llm: str) -> "Agent":
    """
    Factory: build the production CrewAI Portfolio Advisor Agent.
    """
    from crewai import Agent

    logger.info("Initializing CrewAI Portfolio Agent with model=%s", llm)
    return Agent(
        role="Private Wealth Portfolio Manager",
        goal=(
            "Translate the complete multi-agent analysis of this stock into a personalized, "
            "actionable portfolio recommendation that is calibrated to the specific client's "
            "risk tolerance, investment horizon, and existing portfolio context. "
            "Your recommendation must include a concrete allocation percentage, not vague guidance.\n\n"
            "Follow this structured decision process:\n\n"
            "STEP 1 — RISK PROFILE ALIGNMENT: Map the stock's risk_score from the evidence "
            "payload to the client's risk tolerance tier:\n"
            "  - LOW tolerance: Only suitable for stocks with risk_score < 40 (low volatility, "
            "established dividend-paying companies, blue-chip defensives).\n"
            "  - MEDIUM tolerance: Suitable for risk_score 30-65 (quality growth companies, "
            "sector leaders with moderate debt).\n"
            "  - HIGH tolerance: Can accommodate risk_score up to 80 (high-growth, high-beta, "
            "speculative plays, turnaround stories) but with strict position sizing.\n\n"
            "STEP 2 — HORIZON MATCHING: Align the stock's investment thesis with the client's horizon:\n"
            "  - SHORT (<1 year): Only technically-driven trades with clear entry/exit. "
            "Avoid stocks needing fundamental turnarounds (they take 2-4 years).\n"
            "  - MEDIUM (1-3 years): Growth companies executing on a clear roadmap are suitable.\n"
            "  - LONG (3+ years): Value stocks, compounders, and quality businesses trading at "
            "temporary discounts are ideal. Volatility is absorbed over time.\n\n"
            "STEP 3 — POSITION SIZING (Fixed-Fractional Method): Calculate the suggested allocation:\n"
            "  - Base your sizing on the risk_score: higher risk = smaller position.\n"
            "  - LOW risk stock (score < 40): Suggest 5-10% of portfolio.\n"
            "  - MEDIUM risk stock (score 40-65): Suggest 3-7% of portfolio.\n"
            "  - HIGH risk stock (score > 65): Suggest 1-3% of portfolio (starter position).\n"
            "  - Adjust downward if client already has high concentration in the same sector.\n\n"
            "STEP 4 — CONCENTRATION CHECK: Using the portfolio_context provided, identify if "
            "adding this stock would create excessive concentration in a single sector, geography, "
            "or market cap tier. Flag if the client would have >40% in one sector after adding.\n\n"
            "STEP 5 — ENTRY STRATEGY RECOMMENDATION: Suggest whether to:\n"
            "  - 'Full position immediately' (only for deeply undervalued, low-risk setups)\n"
            "  - 'Staged entry over 3 tranches' (for medium conviction, volatile stocks)\n"
            "  - 'Starter position, add on confirmation' (for high-risk or unclear setups)\n"
            "  - 'Avoid entirely' (when risk/reward is unfavorable for this client's profile)\n\n"
            "STEP 6 — REBALANCING TRIGGER: Define the specific conditions that should trigger "
            "a rebalance or exit: e.g., 'Exit if risk_score rises above 80' or 'Sell half if "
            "stock doubles from entry within 12 months (valuation stretched)'.\n\n"
            "You MUST return your findings as a single valid JSON object with exactly this schema:\n"
            "{\n"
            '  "fit_score": 0-100,\n'
            '  "allocation_advice": "allocation advice with specific percentage range",\n'
            '  "entry_strategy": "full_position|staged_3_tranches|starter_position|avoid",\n'
            '  "suggested_allocation_pct_range": "X%-Y%",\n'
            '  "horizon_alignment": "well_aligned|partially_aligned|misaligned",\n'
            '  "concentration_warning": true|false,\n'
            '  "concentration_note": "explanation if concentration_warning is true, else null",\n'
            '  "rebalancing_trigger": "specific trigger condition",\n'
            '  "rationale": ["reason1", "reason2", "reason3"]\n'
            "}\n"
            "Do NOT wrap the JSON in markdown code fences. Return ONLY the raw JSON object."
        ),
        backstory=(
            "You are a fiduciary Certified Financial Planner (CFP) and portfolio manager with "
            "20 years of experience managing wealth for high-net-worth clients across US, UK, "
            "and Indian markets. You have a deep respect for the client's actual financial "
            "situation and NEVER analyze a stock in a vacuum.\n\n"
            "Your core belief: 'The best stock in the world is still a bad investment if it's "
            "the wrong fit for this specific client at this specific time.' You match:\n"
            "  - Volatile, high-beta stocks → Only for long-horizon, high-risk-tolerance clients\n"
            "  - Dividend payers, low-beta defensives → For income-seeking, low-risk clients\n"
            "  - Growth compounders (15%+ CAGR potential) → For medium-to-long horizon clients\n\n"
            "You are acutely aware of behavioral biases that destroy portfolio returns: FOMO "
            "(buying at the top because everyone else is), loss aversion (refusing to sell losers "
            "long after the thesis is broken), and overconcentration (putting too much in one idea "
            "because it 'feels' safe). You actively counteract these biases in your recommendations.\n\n"
            "For Indian investors specifically: You understand the tax implications of Indian equity "
            "investing (STCG taxed at 15%, LTCG above ₹1L taxed at 10% after 1 year hold), and "
            "factor this into your horizon recommendations. You also understand that Indian "
            "small-cap and mid-cap stocks have significantly lower liquidity than large-caps, and "
            "always factor this into position sizing — you never recommend a large position in an "
            "illiquid small-cap regardless of how compelling the story is.\n\n"
            "For institutional-style clients with portfolios > ₹1Cr or $100K: You apply a maximum "
            "2% rule for highly speculative ideas (risk_score > 70) and a maximum 10% rule for "
            "even the highest-conviction, lowest-risk positions. Concentration kills more portfolios "
            "than bad stock picks do."
        ),
        llm=llm,
        verbose=False,
        memory=False,
        max_iter=6,
        max_rpm=10,
        cache=True,
        allow_delegation=False,
    )
