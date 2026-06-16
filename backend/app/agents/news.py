# Flowzint Finance Agent System — agents/news.py — Production Ready

"""
News Agent: deterministic fallback + CrewAI production-grade agent factory.

The NewsAgent class provides a fast, deterministic sentiment scan of headlines
that runs without any LLM. The create_news_agent() factory builds the
production CrewAI Agent with structured JSON output, memory, rate limiting,
and caching.
"""

from __future__ import annotations

import logging

from app.models.analysis import AgentFinding, NewsItem

logger = logging.getLogger(__name__)


class NewsAgent:
    """Deterministic headline scorer — used as fallback when CrewAI is unavailable."""

    name = "News Agent"

    async def run(self, news: list[NewsItem]) -> AgentFinding:
        if not news:
            return AgentFinding(
                agent=self.name,
                summary="No recent headlines were available.",
                confidence=0.3,
                signals=["Add Tavily API credentials for broader real-time coverage."],
                data={"score": 50},
            )

        joined = " ".join(f"{item.title} {item.summary or ''}" for item in news).lower()
        positive_hits = sum(word in joined for word in ["beats", "growth", "upgrade", "surge", "profit", "record"])
        negative_hits = sum(word in joined for word in ["miss", "lawsuit", "downgrade", "falls", "loss", "probe"])
        score = 50 + (positive_hits * 8) - (negative_hits * 8)
        score = max(0, min(100, score))
        tone = "positive" if score >= 60 else "negative" if score <= 40 else "mixed"
        signals = [item.title for item in news[:4]]

        return AgentFinding(
            agent=self.name,
            summary=f"Recent news flow appears {tone} based on {len(news)} headline(s).",
            confidence=0.62,
            signals=signals,
            data={"score": score, "positive_hits": positive_hits, "negative_hits": negative_hits},
        )


def create_news_agent(llm: str, search_tool, scrape_tool) -> "Agent":
    """
    Factory: build the production CrewAI News Agent.

    Returns a crewai.Agent configured with structured JSON output,
    memory, rate limiting, iteration caps, and caching.
    """
    from crewai import Agent

    logger.info("Initializing CrewAI News Agent with model=%s", llm)
    return Agent(
        role="Senior News & Macro Events Analyst",
        goal=(
            "Parse the pre-fetched `news` array in the provided evidence payload and supplement it by analyzing real-time breaking news, corporate announcements, and macro-economic "
            "shifts to determine immediate and short-term price catalysts for the given ticker. "
            "You MUST return your findings as a single valid JSON object with exactly this schema:\n"
            "{\n"
            '  "headline_summary": "concise summary of the most impactful headline",\n'
            '  "catalyst_type": "earnings|macro|regulatory|geopolitical|M&A",\n'
            '  "impact_direction": "bullish|bearish|neutral",\n'
            '  "confidence_score": 0-100,\n'
            '  "sources": ["url1", "url2"]\n'
            "}\n"
            "Do NOT wrap the JSON in markdown code fences. Return ONLY the raw JSON object."
        ),
        backstory=(
            "You are an elite financial journalist and macro analyst who separates "
            "high-conviction signals from market noise. You have a deep understanding of "
            "how regulatory shifts, earnings surprises, and geopolitical events impact equities. "
            "You use web search tools relentlessly to trace the origin of market rumors and "
            "confirm factual corporate developments.\n\n"
            "You cross-reference multiple authoritative sources including Reuters, Bloomberg, "
            "SEC EDGAR filings (8-K, 10-K, 10-Q), Federal Reserve press releases, and FOMC minutes. "
            "You explicitly flag clickbait, unverified rumors, and unsubstantiated social media posts — "
            "you REFUSE to report them as fact. You know the critical difference between a confirmed "
            "SEC 8-K filing and a Twitter/X rumor. You always cite your sources with URLs.\n\n"
            "If no material news exists for the ticker, you state that clearly rather than "
            "fabricating catalysts."
        ),
        llm=llm,
        tools=[search_tool, scrape_tool],
        verbose=False,
        memory=True,
        max_iter=15,
        max_rpm=10,
        cache=True,
        allow_delegation=False,
    )
