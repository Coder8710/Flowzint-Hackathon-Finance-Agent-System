from app.models.analysis import AgentFinding


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
