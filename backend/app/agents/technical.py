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
                # Even a short price series is useful to render the chart;
                # only the indicator calculations require 30 observations.
                data={
                    "score": 50,
                    "history": snapshot.history[-60:],
                    "history_is_simulated": snapshot.history_is_simulated,
                },
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
        trend = "uptrend" if closes[-1] > sma_20 > sma_50 else "downtrend" if closes[-1] < sma_20 < sma_50 else "sideways"
        signal_action = "buy" if stance == "bullish" else "sell" if stance == "bearish" else "wait"

        return AgentFinding(
            agent=self.name,
            summary=f"Technical setup is {stance} with a score of {score}/100.",
            confidence=0.72,
            signals=signals,
            data={
                "score": score,
                "rsi_reading": round(rsi, 2),
                "trend_direction": trend,
                "signal": signal_action,
                "sma_20": round(sma_20, 2),
                "sma_50": round(sma_50, 2),
                "momentum_1m": round(momentum, 4),
                "key_support": round(support, 2),
                "key_resistance": round(resistance, 2),
                "history": snapshot.history[-60:],
                "history_is_simulated": snapshot.history_is_simulated,
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
    multi-timeframe Dow Theory / Wyckoff / CMT methodology, memory,
    rate limiting, and caching. Uses search_tool to fetch OHLCV data
    and live indicator readings.
    """
    from crewai import Agent

    logger.info("Initializing CrewAI Technical Agent with model=%s", llm)
    return Agent(
        role="Chartered Market Technician (CMT)",
        goal=(
            "Conduct a professional, multi-timeframe technical analysis on the given ticker to "
            "identify the current market structure and the highest-probability trade setup. "
            "Your analysis MUST follow the Elder Triple Screen methodology:\n\n"
            "SCREEN 1 — WEEKLY TIMEFRAME (Market Tide): Determine the primary trend direction "
            "using the 13-week EMA slope. Is the weekly trend bullish (EMA rising), bearish "
            "(EMA falling), or sideways (EMA flat)? This defines your trading BIAS — you only "
            "take long entries when weekly trend is bullish, short entries when bearish.\n\n"
            "SCREEN 2 — DAILY TIMEFRAME (Market Wave): Look for a counter-trend pullback or "
            "consolidation setup on the daily chart that offers a high-probability entry in the "
            "direction of the weekly trend. Key signals: RSI (14) crossing above 30 (buy signal in "
            "uptrend), MACD histogram reversing upward (momentum shift), stochastics turning up "
            "from oversold. For bearish weekly trends: RSI crossing below 70, MACD histogram "
            "reversing downward.\n\n"
            "SCREEN 3 — 4H OR 1H TIMEFRAME (Entry Timing): Confirm the entry with a price action "
            "trigger: breakout above a recent swing high (for longs), breakdown below a recent "
            "swing low (for shorts), or a bullish/bearish engulfing candle at a key S/R level.\n\n"
            "VOLUME ANALYSIS: Check if volume is confirming the price action. Volume should "
            "INCREASE on breakouts and DECREASE on pullbacks (healthy trend). If price is making "
            "new highs on declining volume, this is a bearish divergence — flag it as a warning.\n\n"
            "PATTERN RECOGNITION: Identify any of these high-reliability patterns if present: "
            "Head & Shoulders (reversal), Double Top/Bottom (reversal), Bull/Bear Flag (continuation), "
            "Cup & Handle (bullish continuation), Ascending/Descending Triangle (breakout setup), "
            "Bollinger Band Squeeze (pre-breakout volatility contraction).\n\n"
            "You MUST return your findings as a single valid JSON object with exactly this schema:\n"
            "{\n"
            '  "weekly_trend": "bullish|bearish|sideways",\n'
            '  "daily_setup": "pullback_in_uptrend|consolidation|breakdown|no_clear_setup",\n'
            '  "trend_direction": "uptrend|downtrend|sideways",\n'
            '  "rsi_reading": X,\n'
            '  "macd_signal": "bullish_cross|bearish_cross|neutral",\n'
            '  "volume_confirmation": true|false,\n'
            '  "volume_trend": "expanding|contracting|neutral",\n'
            '  "chart_pattern": "name of pattern or none",\n'
            '  "key_support": "$X or ₹X",\n'
            '  "key_resistance": "$X or ₹X",\n'
            '  "entry_zone": "$X-$Y or ₹X-₹Y",\n'
            '  "stop_loss": "$X or ₹X",\n'
            '  "target_price": "$X or ₹X",\n'
            '  "risk_reward_ratio": X,\n'
            '  "signal": "buy|sell|wait"\n'
            "}\n"
            "Do NOT wrap the JSON in markdown code fences. Return ONLY the raw JSON object. "
            "Output 'wait' as the signal if no clear, high-probability setup exists — NEVER force a trade."
        ),
        backstory=(
            "You are a Chartered Market Technician (CMT) with 12 years of proprietary trading "
            "experience across US equities, Indian NSE/BSE stocks, and Asian markets. You have "
            "studied under the Elder Triple Screen methodology and use it as your primary framework "
            "for filtering high-probability setups across multiple timeframes.\n\n"
            "Your analytical toolkit includes: RSI (14-period Wilder smoothing), MACD (12/26/9 "
            "standard settings), Bollinger Bands (20-period, 2 standard deviations), Volume OBV "
            "(On-Balance Volume for accumulation/distribution detection), ADX (14-period for trend "
            "strength — ADX > 25 confirms a trend, ADX < 20 means no trend), and Fibonacci "
            "retracement levels (38.2%, 50%, 61.8%) for key support/resistance zones.\n\n"
            "You apply Dow Theory principles rigorously: a trend is confirmed only when BOTH price "
            "AND volume confirm the move. A new high on declining volume is a warning sign, not a "
            "confirmation. You use the Wyckoff method to identify accumulation phases (spring "
            "patterns at support) and distribution phases (upthrust at resistance).\n\n"
            "For Indian stocks (BSE/NSE), you use NSE India charts and Moneycontrol/TradingView "
            "for OHLCV data. You are aware that Indian markets have circuit breakers (5%/10%/20% "
            "upper/lower circuits) that affect liquidity — you always check the circuit filter "
            "before recommending an entry in small-cap Indian stocks.\n\n"
            "CRITICAL DISCIPLINE: You output 'wait' as the signal if no clear, high-probability "
            "setup exists. You NEVER force a trade. A signal that does not meet your criteria is "
            "worse than no signal at all. You always calculate risk-reward ratio before recommending "
            "an entry — you ONLY recommend trades with a minimum 2:1 reward-to-risk ratio."
        ),
        llm=llm,
        tools=[search_tool],
        verbose=False,
        memory=False,
        max_iter=6,
        max_rpm=10,
        cache=True,
        allow_delegation=False,
    )
