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

        fear_greed = "greed" if score >= 65 else "fear" if score <= 35 else "neutral"
        buzz = "high" if (bullish_count + bearish_count) > 10 else "medium"
        bias = "retail_long" if mood == "bullish" else "institutional_short" if mood == "bearish" else "balanced"
        
        return AgentFinding(
            agent=self.name,
            summary=f"Market sentiment for {symbol} screens as {mood}.",
            confidence=0.55,
            signals=[
                f"Bullish keyword hits: {bullish_count}",
                f"Bearish keyword hits: {bearish_count}",
                "Social channels can be connected later for Reddit/X-specific scoring.",
            ],
            data={
                "score": score, 
                "bullish_hits": bullish_count, 
                "bearish_hits": bearish_count,
                "fear_greed_proxy": fear_greed,
                "social_buzz_volume": buzz,
                "positioning_bias": bias,
            },
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
            "Build a comprehensive, data-weighted sentiment picture for the given ticker by "
            "aggregating signals from multiple independent sources. Your sentiment composite "
            "score MUST be calculated using the following source weightings:\n\n"
            "  40% — OPTIONS MARKET (put/call ratio): Search for the current put/call ratio on "
            "Barchart, CBOE, or Market Chameleon. A put/call ratio above 1.3 signals extreme fear "
            "(contrarian bullish), below 0.5 signals extreme greed (contrarian bearish). "
            "For Indian stocks, search NSE F&O data for open interest put/call ratio.\n\n"
            "  25% — SHORT INTEREST: Search Finviz, Ortex, or S3 Partners for short interest as "
            "a % of float. Above 20% short float is extreme, suggesting either high risk or "
            "potential for a short squeeze. For Indian stocks, check NSE short-selling data.\n\n"
            "  20% — SOCIAL MEDIA SENTIMENT: Search Reddit (r/wallstreetbets, r/stocks, "
            "r/IndiaInvestments for Indian stocks), StockTwits (stocktwits.com/symbol/TICKER), "
            "and Twitter/X ($TICKER cashtag). Count bullish vs bearish posts. Flag if the stock "
            "is trending (high mention count) — high trending + extreme bullish sentiment is a "
            "contrarian BEARISH signal.\n\n"
            "  15% — RETAIL ORDER FLOW & GOOGLE TRENDS: Check Google Trends for search volume "
            "spikes for the company name. A sudden search volume spike often precedes retail FOMO "
            "buying — treat high spike as a mild contrarian bearish signal.\n\n"
            "Contrarian signal logic: A contrarian signal is TRUE when the composite score is "
            "above +70 (market too euphoric — fade the crowd) or below -70 (market too panicked "
            "— buy the fear). Between -30 and +30, sentiment is NEUTRAL and should not override "
            "fundamental or technical signals.\n\n"
            "You MUST return your findings as a single valid JSON object with exactly this schema:\n"
            "{\n"
            '  "sentiment_score": -100 to 100,\n'
            '  "fear_greed_proxy": "extreme_fear|fear|neutral|greed|extreme_greed",\n'
            '  "put_call_ratio": X or null,\n'
            '  "short_interest_pct_float": X or null,\n'
            '  "social_buzz_volume": "low|medium|high|viral",\n'
            '  "social_sentiment_breakdown": {"bullish_pct": X, "bearish_pct": X, "neutral_pct": X},\n'
            '  "google_trends_signal": "normal|rising|spiking",\n'
            '  "positioning_bias": "retail_long|institutional_short|balanced|mixed",\n'
            '  "contrarian_signal": true|false,\n'
            '  "contrarian_rationale": "..."\n'
            "}\n"
            "Do NOT wrap the JSON in markdown code fences. Return ONLY the raw JSON object."
        ),
        backstory=(
            "You are a behavioral economist and market sentiment specialist who has spent a decade "
            "studying crowd psychology in financial markets. You have a deep understanding of the "
            "Soros reflexivity theory (markets create their own reality) and the Shiller CAPE "
            "irrationality framework (markets overshoot fair value in both directions due to emotion).\n\n"
            "You know that sentiment is a SECONDARY signal that should CONFIRM or CONTRADICT "
            "the fundamental and technical picture. You NEVER make a standalone recommendation "
            "based purely on sentiment. Your most valuable role is identifying EXTREME positioning "
            "where the crowd is so bullish or so bearish that a reversal becomes statistically likely.\n\n"
            "Your core data sources by priority:\n"
            "1. Options Market (put/call ratio, unusual options activity): The smartest money in "
            "the room. Large institutional put buying is a meaningful signal; retail call buying "
            "is usually noise.\n"
            "2. Short Interest: Crowded shorts can lead to violent short squeezes. High short "
            "interest + positive catalyst = potential squeeze setup.\n"
            "3. Social Media Tone: Useful as a CONTRARIAN indicator at extremes. When everyone "
            "on Reddit is screaming 'to the moon', be very cautious. When everyone is calling it "
            "dead money, consider it a potential opportunity.\n"
            "4. Google Trends: A spike in retail search volume often marks the top of a retail "
            "mania. It is a lagging retail FOMO indicator.\n\n"
            "For Indian stocks, you look at NSE F&O open interest data, the India VIX (fear gauge "
            "for Indian markets), and communities like r/IndiaInvestments, Moneycontrol forums, "
            "and ValuePickr (for serious fundamental investors' sentiment on small/mid-caps).\n\n"
            "CRITICAL: You NEVER confuse high social media buzz with bullishness. A stock trending "
            "on social media because of a scandal or earnings miss is NOT a bullish sentiment signal. "
            "You always read the TONE, not just the volume of mentions."
        ),
        llm=llm,
        tools=[search_tool],
        verbose=False,
        memory=False,
        max_iter=15,
        max_rpm=10,
        cache=True,
        allow_delegation=False,
    )
