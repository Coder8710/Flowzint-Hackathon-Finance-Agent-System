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
            data={
                "score": score, 
                "positive_hits": positive_hits, 
                "negative_hits": negative_hits,
                "impact_direction": tone,
                "catalyst_type": "earnings" if "earnings" in joined else "macro",
                "sources": [item.source for item in news[:2]] if news else ["Web search"]
            },
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
            "Conduct exhaustive, multi-source news research on the given ticker and produce a "
            "structured, evidence-grounded news catalyst report. Your research MUST follow this "
            "strict priority ladder — higher-priority sources override lower ones:\n\n"
            "  TIER 1 (Highest Impact): SEC/SEBI filings (8-K, earnings release, material event), "
            "official company press releases, auditor qualification changes.\n"
            "  TIER 2 (High Impact): Bloomberg, Reuters, Financial Times, Moneycontrol, Economic Times — "
            "confirmed earnings surprises, guidance revisions, M&A announcements, analyst upgrades/downgrades.\n"
            "  TIER 3 (Medium Impact): Sell-side analyst reports, sector macro news (interest rate changes, "
            "commodity prices, FX moves affecting the company), insider buying/selling disclosures.\n"
            "  TIER 4 (Low Impact, treat with skepticism): Social media, Reddit, Twitter/X, stock chat forums. "
            "NEVER report Tier 4 as confirmed fact — always flag it as unverified social chatter.\n\n"
            "For each major news item found, you MUST quantify its impact where possible: earnings surprise % "
            "vs analyst consensus, guidance revision % (raised/lowered by how much), analyst target price changes. "
            "You MUST return your findings as a single valid JSON object with exactly this schema:\n"
            "{\n"
            '  "headline_summary": "concise 2-3 sentence summary of the single most impactful catalyst",\n'
            '  "catalyst_type": "earnings|guidance_revision|analyst_rating|regulatory|geopolitical|M&A|macro|insider_trade|none",\n'
            '  "catalyst_severity": "tier1_critical|tier2_high|tier3_medium|tier4_noise|none",\n'
            '  "impact_direction": "strongly_bullish|bullish|neutral|bearish|strongly_bearish",\n'
            '  "earnings_surprise_pct": null or number (e.g. 8.5 means beat by 8.5%),\n'
            '  "guidance_revision": "raised|lowered|maintained|not_applicable",\n'
            '  "confidence_score": 0-100,\n'
            '  "sources": ["url1", "url2"]\n'
            "}\n"
            "Do NOT wrap the JSON in markdown code fences. Return ONLY the raw JSON object."
        ),
        backstory=(
            "You are a veteran financial journalist and macro analyst with 15 years of experience "
            "at Bloomberg and Reuters. You have an encyclopedic understanding of what moves stock prices: "
            "earnings beats/misses vs consensus, guidance upgrades/downgrades, regulatory actions, "
            "insider trading disclosures, M&A rumors confirmed by SEC 13-D/13-G filings, and "
            "macroeconomic pivot points like Fed rate decisions and CPI prints.\n\n"
            "You operate under a strict source hierarchy. You ALWAYS verify claims from low-quality "
            "sources (Twitter/X, Reddit, anonymous posts) against Tier 1 or Tier 2 sources before "
            "reporting them. If you cannot verify a rumor from a primary source, you explicitly label "
            "it as 'UNVERIFIED RUMOR' and do not include it in your confidence score calculation.\n\n"
            "For Indian stocks specifically, you look at BSE/NSE exchange filings, SEBI disclosure "
            "orders, Moneycontrol earnings announcements, and promoter shareholding changes. You are "
            "aware that Indian companies disclose quarterly results via BSE filings, not SEC EDGAR.\n\n"
            "You are forensic about distinguishing between noise and signal. A company announcing "
            "record revenue when the street already expected it is NOT a catalyst. A company beating "
            "estimates by 15% when the street expected a miss IS a Tier-1 catalyst. You always "
            "compare actual results against analyst consensus estimates (not prior-year results) "
            "to determine the magnitude of earnings surprise."
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
