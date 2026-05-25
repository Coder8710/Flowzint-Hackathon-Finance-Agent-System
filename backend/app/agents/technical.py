from statistics import mean

from app.models.analysis import AgentFinding
from app.services.finance_data import MarketSnapshot


class TechnicalAnalysisAgent:
    name = "Technical Analysis Agent"

    async def run(self, snapshot: MarketSnapshot) -> AgentFinding:
        closes = [float(row["close"]) for row in snapshot.history if "close" in row]
        if len(closes) < 30:
            return AgentFinding(
                agent=self.name,
                summary="Technical history is too short for reliable indicators.",
                confidence=0.35,
                signals=["Need at least 30 closing prices to compute trend indicators."],
                data={"score": 50},
            )

        rsi = _rsi(closes[-15:])
        sma_20 = mean(closes[-20:])
        sma_50 = mean(closes[-50:]) if len(closes) >= 50 else mean(closes)
        momentum = (closes[-1] - closes[-21]) / closes[-21] if len(closes) > 21 else 0
        support = min(closes[-30:])
        resistance = max(closes[-30:])

        score = 50
        signals: list[str] = []

        if closes[-1] > sma_20 > sma_50:
            signals.append("Price is trading above the 20-day and 50-day moving averages.")
            score += 18
        elif closes[-1] < sma_20 < sma_50:
            signals.append("Price is trading below the 20-day and 50-day moving averages.")
            score -= 18
        else:
            signals.append("Moving averages are mixed, suggesting an undecided trend.")

        if rsi < 35:
            signals.append(f"RSI near {rsi:.1f} suggests oversold conditions.")
            score += 8
        elif rsi > 70:
            signals.append(f"RSI near {rsi:.1f} suggests overbought conditions.")
            score -= 8
        else:
            signals.append(f"RSI near {rsi:.1f} is neutral.")

        if momentum > 0.08:
            signals.append(f"One-month momentum is strong at {momentum * 100:.1f}%.")
            score += 10
        elif momentum < -0.08:
            signals.append(f"One-month momentum is weak at {momentum * 100:.1f}%.")
            score -= 10

        score = max(0, min(100, score))
        stance = "bullish" if score >= 62 else "bearish" if score <= 42 else "neutral"
        return AgentFinding(
            agent=self.name,
            summary=f"Technical setup is {stance} with a score of {score}/100.",
            confidence=0.72,
            signals=signals,
            data={
                "score": score,
                "rsi": round(rsi, 2),
                "sma_20": round(sma_20, 2),
                "sma_50": round(sma_50, 2),
                "momentum_1m": round(momentum, 4),
                "support": round(support, 2),
                "resistance": round(resistance, 2),
                "history": snapshot.history[-60:],
            },
        )


def _rsi(closes: list[float]) -> float:
    gains: list[float] = []
    losses: list[float] = []
    for previous, current in zip(closes, closes[1:]):
        delta = current - previous
        gains.append(max(delta, 0))
        losses.append(abs(min(delta, 0)))

    avg_gain = mean(gains) if gains else 0
    avg_loss = mean(losses) if losses else 0
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))
