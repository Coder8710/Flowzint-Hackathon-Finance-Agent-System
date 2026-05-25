from statistics import mean, stdev

from app.models.analysis import AgentFinding
from app.services.finance_data import MarketSnapshot


class RiskAnalysisAgent:
    name = "Risk Analysis Agent"

    async def run(self, snapshot: MarketSnapshot) -> AgentFinding:
        closes = [float(row["close"]) for row in snapshot.history if "close" in row]
        returns = [(current - previous) / previous for previous, current in zip(closes, closes[1:]) if previous]
        volatility = stdev(returns) * (252**0.5) if len(returns) > 2 else 0.25
        drawdown = _max_drawdown(closes)

        risk = 35
        signals: list[str] = []
        if volatility > 0.55:
            signals.append(f"Annualized volatility is high near {volatility * 100:.1f}%.")
            risk += 22
        elif volatility < 0.28:
            signals.append(f"Annualized volatility is moderate near {volatility * 100:.1f}%.")
            risk -= 6
        else:
            signals.append(f"Annualized volatility is elevated near {volatility * 100:.1f}%.")
            risk += 8

        if drawdown < -0.25:
            signals.append(f"Recent max drawdown is steep at {drawdown * 100:.1f}%.")
            risk += 16
        elif drawdown > -0.1:
            signals.append(f"Recent max drawdown is contained at {drawdown * 100:.1f}%.")
            risk -= 5

        if snapshot.beta is not None:
            if snapshot.beta > 1.4:
                signals.append(f"Beta near {snapshot.beta:.2f} indicates above-market sensitivity.")
                risk += 10
            elif snapshot.beta < 0.9:
                signals.append(f"Beta near {snapshot.beta:.2f} indicates below-market sensitivity.")
                risk -= 5

        if snapshot.debt_to_equity is not None and snapshot.debt_to_equity > 130:
            signals.append("Leverage adds balance-sheet risk.")
            risk += 8

        avg_return = mean(returns) if returns else 0
        if avg_return < -0.002:
            risk += 6
            signals.append("Average daily return has recently skewed negative.")

        risk = max(0, min(100, int(round(risk))))
        level = "high" if risk >= 67 else "low" if risk <= 35 else "medium"
        return AgentFinding(
            agent=self.name,
            summary=f"Risk profile is {level} with a score of {risk}/100.",
            confidence=0.73,
            signals=signals,
            data={"score": 100 - risk, "risk_score": risk, "volatility": volatility, "max_drawdown": drawdown},
        )


def _max_drawdown(values: list[float]) -> float:
    if not values:
        return 0
    peak = values[0]
    worst = 0.0
    for value in values:
        peak = max(peak, value)
        worst = min(worst, (value - peak) / peak)
    return worst
