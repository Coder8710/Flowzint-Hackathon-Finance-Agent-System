# Flowzint Finance Agent System — agents/technical.py — Production Ready

"""
Technical Agent: deterministic fallback + CrewAI production-grade agent factory.

The TechnicalAnalysisAgent class provides a fast, deterministic indicator
scorer (RSI, SMA, momentum) that runs without any LLM. The
create_technical_agent() factory builds the production CrewAI Agent with
structured JSON output, memory, rate limiting, and caching.
"""

from __future__ import annotations

import logging
from statistics import mean

from app.models.analysis import AgentFinding
from app.services.finance_data import MarketSnapshot

logger = logging.getLogger(__name__)


class TechnicalAnalysisAgent:
    """Deterministic technical scorer — used as fallback when CrewAI is unavailable."""

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


def create_technical_agent(llm: str, search_tool) -> "Agent":
    """
    Factory: build the production CrewAI Technical Agent.

    Returns a crewai.Agent configured with structured JSON output,
    Dow Theory / Wyckoff / CMT methodology, memory, rate limiting, and caching.
    Uses search_tool only (for fetching OHLCV data and indicator readings).
    """
    from crewai import Agent

    logger.info("Initializing CrewAI Technical Agent with model=%s", llm)
    return Agent(
        role="Chartered Market Technician (CMT)",
        goal=(
            "Identify optimal entry and exit points for the given ticker by analyzing price action, "
            "moving averages, momentum oscillators, and volume profiles. "
            "You MUST return your findings as a single valid JSON object with exactly this schema:\n"
            "{\n"
            '  "trend_direction": "uptrend|downtrend|sideways",\n'
            '  "rsi_reading": X,\n'
            '  "macd_signal": "bullish_cross|bearish_cross|neutral",\n'
            '  "volume_confirmation": true|false,\n'
            '  "key_support": "$X",\n'
            '  "key_resistance": "$X",\n'
            '  "entry_zone": "$X-$Y",\n'
            '  "stop_loss": "$X",\n'
            '  "target_price": "$X",\n'
            '  "signal": "buy|sell|wait"\n'
            "}\n"
            "Do NOT wrap the JSON in markdown code fences. Return ONLY the raw JSON object."
        ),
        backstory=(
            "You are a disciplined quantitative and technical trader holding the Chartered Market "
            "Technician (CMT) designation. You believe that price is truth and that all known "
            "information is already discounted into the chart.\n\n"
            "You look for convergence/divergence in RSI (14-period), MACD crosses (12/26/9), "
            "Bollinger Band squeezes, and key psychological support/resistance levels. You apply "
            "Dow Theory principles (confirming trends across multiple timeframes), Wyckoff method "
            "(accumulation/distribution phases), and CMT-level pattern recognition including "
            "head-and-shoulders, double tops/bottoms, and measured moves.\n\n"
            "You search the web for recent OHLCV data and current indicator readings from financial "
            "data providers. Your objective is to assess the current market trend and judge the timing "
            "risk of initiating a position today. CRITICAL: You output 'wait' as the signal if no "
            "clear, high-probability setup exists — you NEVER force a trade."
        ),
        llm=llm,
        tools=[search_tool],
        verbose=False,
        memory=True,
        max_iter=15,
        max_rpm=10,
        cache=True,
        allow_delegation=False,
    )
