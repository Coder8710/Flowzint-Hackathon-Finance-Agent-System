from app.models.analysis import AgentFinding
from app.services.finance_data import MarketSnapshot


class FundamentalAnalysisAgent:
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
        return AgentFinding(
            agent=self.name,
            summary=f"Fundamentals look {stance} with a score of {score}/100.",
            confidence=0.74,
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
