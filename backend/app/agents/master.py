from __future__ import annotations

import asyncio
import re

from app.agents.fundamental import FundamentalAnalysisAgent
from app.agents.news import NewsAgent
from app.agents.portfolio import PortfolioAdvisorAgent
from app.agents.risk import RiskAnalysisAgent
from app.agents.sentiment import SentimentAnalysisAgent
from app.agents.technical import TechnicalAnalysisAgent
from app.crews.finance_crew import CrewAIUnavailableError, FinanceCrew
from app.models.analysis import AgentFinding, AnalysisRequest, AnalysisResponse, CompanyAnalysis
from app.services.finance_data import FinanceDataService
from app.services.news_data import NewsDataService


POPULAR_TICKERS = {
    "APPLE": "AAPL",
    "MICROSOFT": "MSFT",
    "NVIDIA": "NVDA",
    "TESLA": "TSLA",
    "AMAZON": "AMZN",
    "GOOGLE": "GOOGL",
    "ALPHABET": "GOOGL",
    "META": "META",
    "FACEBOOK": "META",
    "NETFLIX": "NFLX",
    "AMD": "AMD",
    "INTEL": "INTC",
    "DISNEY": "DIS",
    "NIKE": "NKE",
    "COCA-COLA": "KO",
    "COCACOLA": "KO",
    "PEPSI": "PEP",
    "WALMART": "WMT",
    "JPMORGAN": "JPM",
    "GOLDMAN": "GS",
    "BOEING": "BA",
    "BERKSHIRE": "BRK-B",
    "PAYPAL": "PYPL",
    "UBER": "UBER",
    "SPOTIFY": "SPOT",
    "SALESFORCE": "CRM",
    "ORACLE": "ORCL",
    "ADOBE": "ADBE",
    "SNOWFLAKE": "SNOW",
    "PALANTIR": "PLTR",
    "COINBASE": "COIN",
}


class MasterAgent:
    """Coordinates sub-agents and produces the final investment report."""

    def __init__(self) -> None:
        self.finance = FinanceDataService()
        self.news_data = NewsDataService()
        self.fundamental = FundamentalAnalysisAgent()
        self.technical = TechnicalAnalysisAgent()
        self.news = NewsAgent()
        self.sentiment = SentimentAnalysisAgent()
        self.risk = RiskAnalysisAgent()
        self.portfolio = PortfolioAdvisorAgent()
        self.finance_crew = FinanceCrew()

    async def analyze(self, request: AnalysisRequest) -> AnalysisResponse:
        symbols = _extract_symbols(request.query)
        analyses = await asyncio.gather(*(self._analyze_symbol(symbol, request) for symbol in symbols))
        return AnalysisResponse(
            query=request.query,
            symbols=symbols,
            summary=_build_overall_summary(analyses),
            analyses=list(analyses),
            disclaimer=(
                "This is AI-generated research support, not financial advice. "
                "Validate data and consult a licensed advisor before investing."
            ),
        )

    async def _analyze_symbol(self, symbol: str, request: AnalysisRequest) -> CompanyAnalysis:
        snapshot = await self.finance.get_snapshot(symbol)
        news_items = await self.news_data.search_company_news(symbol, snapshot.company_name)

        fundamental, technical, news, sentiment, risk = await asyncio.gather(
            self.fundamental.run(snapshot),
            self.technical.run(snapshot),
            self.news.run(news_items),
            self.sentiment.run(symbol, news_items),
            self.risk.run(snapshot),
        )
        risk_score = int(risk.data.get("risk_score", 50))
        portfolio = await self.portfolio.run(
            symbol=symbol,
            risk_tolerance=request.risk_tolerance,
            horizon=request.horizon,
            risk_score=risk_score,
            portfolio_context=request.portfolio_context,
        )
        agents = [fundamental, technical, news, sentiment, risk, portfolio]
        composite = _weighted_score(agents)
        recommendation = "Buy" if composite >= 64 and risk_score < 78 else "Sell" if composite <= 42 else "Hold"
        target_bias = _bias_from_score(composite)
        thesis = _top_thesis(agents)
        action_items = _action_items(symbol, recommendation, risk_score)

        try:
            crew_result = await asyncio.to_thread(
                self.finance_crew.run,
                snapshot,
                agents,
                news_items,
                request.risk_tolerance,
                request.horizon,
                request.portfolio_context,
            )
            recommendation = crew_result["recommendation"]
            target_bias = crew_result["target_bias"]
            thesis = crew_result["thesis"] or thesis
            action_items = crew_result["action_items"] or action_items
        except CrewAIUnavailableError as exc:
            agents.append(
                AgentFinding(
                    agent="CrewAI Orchestrator",
                    summary=f"CrewAI synthesis skipped: {exc}",
                    confidence=0.4,
                    signals=[
                        "Set OPENAI_API_KEY or GEMINI_API_KEY and install CrewAI dependencies to enable live LLM committee synthesis."
                    ],
                    data={"score": composite, "mode": "deterministic_fallback"},
                )
            )

        return CompanyAnalysis(
            symbol=symbol,
            company_name=snapshot.company_name,
            recommendation=recommendation,
            confidence=round(min(0.92, max(0.45, abs(composite - 50) / 70 + 0.48)), 2),
            risk_score=risk_score,
            target_bias=target_bias,
            thesis=thesis,
            action_items=action_items,
            agents=agents,
            news=news_items,
        )


def _extract_symbols(query: str) -> list[str]:
    """Extract stock ticker symbols from a user query."""
    upper = query.upper()
    discovered: list[str] = []

    # Pre-compute all uppercase words in the query once
    all_uppercase_words = set(re.findall(r"\b[A-Z]{1,5}\b", upper))
    # Known company names that should NOT be treated as tickers
    company_names = set(POPULAR_TICKERS.keys())
    known_tickers = set(POPULAR_TICKERS.values())

    # Match popular company names and their tickers
    for name, ticker in POPULAR_TICKERS.items():
        if name in upper or ticker in all_uppercase_words:
            discovered.append(ticker)

    # Find additional potential tickers (2-5 uppercase letters)
    # Exclude common English words and known company names
    ignored = {
        "AI", "VS", "AND", "THE", "BUY", "SELL", "HOLD", "STOCK",
        "IN", "OR", "AN", "AT", "TO", "IF", "OF", "ON", "IS", "IT",
        "FOR", "NOT", "ARE", "BUT", "HAS", "HAD", "DO", "CAN", "MAY",
        "SHOULD", "WOULD", "COULD", "WILL", "NOW", "HOW", "WHY", "WHAT",
        "INVEST", "COMPARE", "ABOUT", "WITH", "FROM", "INTO",
        "GOOD", "BAD", "BEST", "WORST", "LONG", "SHORT", "TERM",
        "MY", "ME", "WE", "UP", "SO", "NO", "GO", "BE",
        "ANALYZE",
    }
    for word in all_uppercase_words:
        if len(word) >= 2 and word not in ignored and word not in company_names and word not in discovered:
            discovered.append(word)

    unique = list(dict.fromkeys(discovered))
    return unique[:3] or ["AAPL"]


def _weighted_score(agents: list) -> float:
    weights = {
        "Fundamental Analysis Agent": 0.24,
        "Technical Analysis Agent": 0.22,
        "News Agent": 0.14,
        "Sentiment Analysis Agent": 0.12,
        "Risk Analysis Agent": 0.16,
        "Portfolio Advisor Agent": 0.12,
    }
    total = 0.0
    for agent in agents:
        total += float(agent.data.get("score", 50)) * weights.get(agent.agent, 0.1)
    return total


def _bias_from_score(score: float) -> str:
    if score >= 70:
        return "Strong upside bias"
    if score >= 60:
        return "Moderate upside bias"
    if score <= 35:
        return "Strong downside bias"
    if score <= 45:
        return "Moderate downside bias"
    return "Balanced risk/reward"


def _top_thesis(agents: list) -> list[str]:
    thesis: list[str] = []
    for agent in agents:
        thesis.extend(agent.signals[:2])
    return thesis[:6]


def _action_items(symbol: str, recommendation: str, risk_score: int) -> list[str]:
    items = [f"Track upcoming earnings and guidance revisions for {symbol}."]
    if recommendation == "Buy":
        items.append("Consider staged entries instead of a single full-position purchase.")
    elif recommendation == "Sell":
        items.append("Review whether downside catalysts outweigh your investment thesis.")
    else:
        items.append("Wait for clearer confirmation from price trend or fundamental catalysts.")
    if risk_score > 65:
        items.append("Use position sizing and stop-loss rules because volatility risk is elevated.")
    return items


def _build_overall_summary(analyses: list[CompanyAnalysis]) -> str:
    if len(analyses) == 1:
        item = analyses[0]
        return f"{item.symbol} screens as {item.recommendation} with {item.target_bias.lower()}."
    ranked = sorted(analyses, key=lambda item: item.risk_score)
    return (
        f"Compared {len(analyses)} stocks. "
        f"{ranked[0].symbol} has the lowest measured risk, while recommendations vary by agent signal strength."
    )
