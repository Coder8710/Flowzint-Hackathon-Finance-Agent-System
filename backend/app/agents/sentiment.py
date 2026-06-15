# Flowzint Finance Agent System — agents/sentiment.py — Production Ready

"""
Sentiment Agent: deterministic fallback + CrewAI production-grade agent factory.

The SentimentAnalysisAgent class provides a fast, deterministic keyword-based
sentiment scorer that runs without any LLM. The create_sentiment_agent()
factory builds the production CrewAI Agent with structured JSON output,
memory, rate limiting, and caching.
"""

from __future__ import annotations

import logging

from app.models.analysis import AgentFinding, NewsItem

logger = logging.getLogger(__name__)


class SentimentAnalysisAgent:
    """Deterministic keyword sentiment scorer — used as fallback when CrewAI is unavailable."""

    name = "Sentiment Analysis Agent"

    async def run(self, symbol: str, news: list[NewsItem]) -> AgentFinding:
        text = " ".join(f"{item.title} {item.summary or ''}" for item in news).lower()
        bullish = ["buy", "bull", "surge", "optimistic", "outperform", "demand", "ai", "record"]
        bearish = ["sell", "bear", "slump", "concern", "underperform", "weak", "delay", "risk"]
        bullish_count = sum(text.count(word) for word in bullish)
        bearish_count = sum(text.count(word) for word in bearish)
        raw = bullish_count - bearish_count
        score = max(0, min(100, 50 + raw * 7))
        mood = "bullish" if score >= 61 else "bearish" if score <= 39 else "neutral"

        return AgentFinding(
            agent=self.name,
            summary=f"Market sentiment for {symbol} screens as {mood}.",
            confidence=0.55,
            signals=[
                f"Bullish keyword hits: {bullish_count}",
                f"Bearish keyword hits: {bearish_count}",
                "Social channels can be connected later for Reddit/X-specific scoring.",
            ],
            data={"score": score, "bullish_hits": bullish_count, "bearish_hits": bearish_count},
        )


def create_sentiment_agent(llm: str, search_tool) -> "Agent":
    """
    Factory: build the production CrewAI Sentiment Agent.

    Returns a crewai.Agent configured with structured JSON output,
    behavioral finance methodology, memory, rate limiting, and caching.
    Uses search_tool only (for scanning social signals and news tone).
    """
    from crewai import Agent

    logger.info("Initializing CrewAI Sentiment Agent with model=%s", llm)
    return Agent(
        role="Behavioral Finance & Sentiment Strategist",
        goal=(
            "Measure fear, greed, and crowd positioning for the given ticker by analyzing social "
            "media tone, options flow proxies, and retail vs. institutional behavior. "
            "You MUST return your findings as a single valid JSON object with exactly this schema:\n"
            "{\n"
            '  "sentiment_score": -100 to 100,\n'
            '  "fear_greed_proxy": "extreme_fear|fear|neutral|greed|extreme_greed",\n'
            '  "social_buzz_volume": "low|medium|high",\n'
            '  "positioning_bias": "retail_long|institutional_short|balanced|mixed",\n'
            '  "contrarian_signal": true|false,\n'
            '  "contrarian_rationale": "..."\n'
            "}\n"
            "Do NOT wrap the JSON in markdown code fences. Return ONLY the raw JSON object."
        ),
        backstory=(
            "You are an expert in behavioral economics and market psychology. You know that markets "
            "are driven by human emotion just as much as by numbers. You track whether the market is "
            "overly euphoric or deeply pessimistic regarding the asset, looking for contrarian "
            "opportunities.\n\n"
            "You weight multiple sentiment inputs: put/call ratio, short interest data, "
            "Reddit (r/wallstreetbets, r/stocks) and StockTwits tone analysis, Google Trends "
            "search volume for the ticker, and CNN Fear & Greed Index readings. You understand "
            "that contrarian signals matter most at sentiment extremes (scores above +80 or below -80).\n\n"
            "CRITICAL: You NEVER act on sentiment alone — you always flag sentiment as a secondary "
            "confirming or conflicting signal relative to the fundamental and technical analysis. "
            "If sentiment is neutral (between -30 and +30), you explicitly state that sentiment is "
            "not a useful signal at this time."
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
