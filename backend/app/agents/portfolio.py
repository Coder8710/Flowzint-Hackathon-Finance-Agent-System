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
        score = 55

        if risk_tolerance == "low" and risk_score > 55:
            signals.append(f"{symbol} may be too volatile for a low-risk profile.")
            score -= 14
        elif risk_tolerance == "high" and risk_score < 75:
            signals.append(f"{symbol} risk appears acceptable for a high-risk profile.")
            score += 8
        else:
            signals.append(f"{symbol} broadly matches a {risk_tolerance}-risk profile.")

        if horizon == "long":
            signals.append("Longer time horizon can absorb more short-term volatility.")
            score += 6
        elif horizon == "short" and risk_score > 50:
            signals.append("Short horizon increases timing risk.")
            score -= 8

        if portfolio_context:
            signals.append("Portfolio notes were considered for concentration and fit.")
            if "tech" in portfolio_context.lower() and symbol not in {"AAPL", "MSFT", "GOOGL", "NVDA", "META"}:
                signals.append("Non-mega-cap-tech exposure may improve diversification.")
                score += 4

        score = max(0, min(100, score))
        return AgentFinding(
            agent=self.name,
            summary=f"Portfolio fit score is {score}/100 for the selected profile.",
            confidence=0.58,
            signals=signals,
            data={"score": score, "risk_tolerance": risk_tolerance, "horizon": horizon},
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
            "Translate raw stock analysis into personalized, actionable portfolio sizing advice "
            "based on the client's specific risk tolerance, investment horizon, and existing portfolio context. "
            "You MUST return your findings as a single valid JSON object with exactly this schema:\n"
            "{\n"
            '  "fit_score": 0-100,\n'
            '  "allocation_advice": "allocation advice text",\n'
            '  "rationale": ["reason1", "reason2", "reason3"]\n'
            "}\n"
            "Do NOT wrap the JSON in markdown code fences. Return ONLY the raw JSON object."
        ),
        backstory=(
            "You are a fiduciary wealth manager. You never analyze a stock in a vacuum; you only analyze how "
            "it fits into a specific human being's portfolio. You rely strictly on the `user_profile` "
            "provided in the evidence payload to understand the client's risk tolerance, investment horizon, "
            "and existing portfolio context. You match volatile, high-growth stocks with long-horizon, "
            "high-risk clients, and recommend against them for conservative clients. "
            "You carefully consider existing concentration risks and cash requirements."
        ),
        llm=llm,
        verbose=False,
        memory=True,
        max_iter=15,
        max_rpm=10,
        cache=True,
        allow_delegation=False,
    )
