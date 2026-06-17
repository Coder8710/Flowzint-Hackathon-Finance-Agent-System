from __future__ import annotations

import asyncio
import re
import logging

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

logger = logging.getLogger(__name__)


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
        symbols = await _extract_symbols(request.query)
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

            if "specialist_findings" in crew_result:
                sf = crew_result["specialist_findings"]
                dynamic_agents = []
                for a in agents:
                    key = None
                    if "news" in a.agent.lower(): key = "news"
                    elif "fundamental" in a.agent.lower(): key = "fundamental"
                    elif "technical" in a.agent.lower(): key = "technical"
                    elif "sentiment" in a.agent.lower(): key = "sentiment"
                    elif "risk" in a.agent.lower(): key = "risk"
                    elif "portfolio" in a.agent.lower(): key = "portfolio"

                    if key and key in sf and sf[key]:
                        data_dict = sf[key]
                        summary = ""
                        signals = []
                        confidence = 0.8
                        score = 50

                        if key == "news":
                            summary = data_dict.get("headline_summary") or "News catalyst scanned."
                            impact = data_dict.get("impact_direction") or "neutral"
                            signals = [
                                f"Catalyst type: {data_dict.get('catalyst_type', 'N/A')}",
                                f"Impact direction: {impact}"
                            ]
                            if data_dict.get("sources"):
                                signals.append(f"Sources: {', '.join(data_dict['sources'])}")
                            confidence = float(data_dict.get("confidence_score", 80)) / 100.0
                            score = 80 if impact == "bullish" else 30 if impact == "bearish" else 50
                        elif key == "fundamental":
                            val_est = data_dict.get("intrinsic_value_estimate") or "N/A"
                            premium_pct = data_dict.get("current_price_premium_discount_pct") or "N/A"
                            summary = f"Intrinsic value: {val_est} ({premium_pct} premium/discount)"
                            signals = [
                                f"Moat rating: {data_dict.get('moat_rating', 'none')}",
                                f"Recommendation: {data_dict.get('recommendation', 'hold')}"
                            ]
                            key_metrics = data_dict.get("key_metrics") or {}
                            non_nulls = sum(1 for v in key_metrics.values() if v is not None)
                            confidence = 0.5 + (non_nulls * 0.09)
                            rec = data_dict.get("recommendation") or "hold"
                            score = 85 if rec.lower() == "buy" else 30 if rec.lower() in ("sell", "avoid") else 55
                        elif key == "technical":
                            trend = data_dict.get("trend_direction") or "sideways"
                            sig = data_dict.get("signal") or "wait"
                            summary = f"Trend is {trend} with signal {sig}."
                            signals = [
                                f"MACD: {data_dict.get('macd_signal', 'neutral')}, RSI: {data_dict.get('rsi_reading', 'N/A')}",
                                f"Support: {data_dict.get('key_support', 'N/A')}, Resistance: {data_dict.get('key_resistance', 'N/A')}"
                            ]
                            confidence = 0.85
                            score = 80 if sig.lower() == "buy" else 30 if sig.lower() == "sell" else 50
                        elif key == "sentiment":
                            summary = f"Sentiment score is {data_dict.get('sentiment_score', 0)}/100 ({data_dict.get('fear_greed_proxy', 'neutral')})."
                            signals = [
                                f"Buzz: {data_dict.get('social_buzz_volume', 'medium')}, Contrarian: {data_dict.get('contrarian_signal', False)}",
                                f"Bias: {data_dict.get('positioning_bias', 'mixed')}"
                            ]
                            confidence = 0.80
                            score = (int(data_dict.get("sentiment_score", 0)) + 100) / 2
                        elif key == "risk":
                            summary = f"Risk score is {data_dict.get('risk_score', 50)}/100."
                            signals = data_dict.get("risks") or []
                            confidence = 0.75
                            score = 100 - int(data_dict.get("risk_score", 50))
                            risk_score = int(data_dict.get("risk_score", risk_score))
                        elif key == "portfolio":
                            summary = f"Portfolio fit score is {data_dict.get('fit_score', 50)}/100."
                            signals = [data_dict.get("allocation_advice", "No advice provided")] + (data_dict.get("rationale") or [])
                            confidence = 0.80
                            score = int(data_dict.get("fit_score", 50))

                        dynamic_agents.append(AgentFinding(
                            agent=a.agent,
                            summary=summary,
                            confidence=round(max(0.1, min(1.0, confidence)), 2),
                            signals=signals,
                            data=data_dict
                        ))
                    else:
                        dynamic_agents.append(a)
                agents = dynamic_agents
                composite = _weighted_score(agents)
        except CrewAIUnavailableError as exc:
            logger.info("CrewAI committee synthesis skipped: %s. Using deterministic fallback.", exc)


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


async def _search_yahoo_ticker(query_str: str) -> str | None:
    """Query Yahoo Finance Search API to find the best matching stock ticker in US, India, Japan, China, or Dubai."""
    import httpx
    from urllib.parse import quote_plus

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    TARGET_EXCHANGES = {
        "NMS", "NYQ", "ASE",  # US
        "NSE", "BSE",        # India
        "JPX", "TYO", "TKS",  # Japan
        "SHH", "SHE", "HKG",  # China / HK
        "DFM", "DUB", "DUD"   # Dubai
    }

    TARGET_SUFFIXES = (
        ".NS", ".BO",
        ".T",
        ".SS", ".SZ", ".HK",
        ".AE", ".DU"
    )

    async def do_search(q: str) -> str | None:
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={quote_plus(q)}"
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    quotes = data.get("quotes", [])

                    # Priority 1: Equity in target countries (by exchange or symbol suffix)
                    for quote in quotes:
                        symbol = quote.get("symbol")
                        exch = quote.get("exchange")
                        qtype = quote.get("quoteType")
                        if symbol and qtype == "EQUITY":
                            if exch in TARGET_EXCHANGES or symbol.endswith(TARGET_SUFFIXES):
                                return symbol

                    # Priority 2: Any general equity
                    for quote in quotes:
                        symbol = quote.get("symbol")
                        qtype = quote.get("quoteType")
                        if symbol and qtype == "EQUITY":
                            return symbol

                    # Priority 3: First available symbol of any type
                    if quotes and quotes[0].get("symbol"):
                        return quotes[0]["symbol"]
        except Exception as e:
            logger.error("Error dynamically searching Yahoo ticker for %s: %s", q, e)
        return None

    # First attempt: search with original query string
    result = await do_search(query_str)
    if result:
        return result

    # Second attempt: if no quotes found and query has spaces, try stripping spaces (e.g., "icici amc" -> "iciciamc")
    if " " in query_str:
        collapsed = query_str.replace(" ", "")
        result = await do_search(collapsed)
        if result:
            return result

    return None


async def _extract_symbols(query: str) -> list[str]:
    """Extract stock ticker symbols from a user query dynamically, targeting India, US, Japan, China, and Dubai."""
    # Split query into potential segments based on comparisons/conjunctions/commas
    parts = re.split(r"\b(?:vs|versus|and)\b|,", query, flags=re.IGNORECASE)
    discovered: list[str] = []

    # Common words to ignore when cleaning up search query segments
    search_ignored = {
        "analyze", "analysis", "stock", "stocks", "share", "shares", 
        "price", "prices", "chart", "charts", "of", "about", "for", "in", "on", "the", "a", "an",
        "company", "corporation", "corp", "co", "ltd", "limited", "inc", "incorporated",
        "what", "is", "are", "trend", "trends", "buy", "buying", "sell", "selling", "hold", "holding", 
        "please", "run", "me", "show", "to", "info", "information", "report", "reports",
        "versus", "vs", "and", "compare", "comparison", "or", "with", "against",
        "good", "bad", "best", "worst", "great", "fine", "nice", "awesome", "strong", "weak", 
        "bullish", "bearish", "undervalued", "overvalued", "cheap", "expensive", "worth", 
        "positive", "negative", "growth", "value", "momentum", "potential", "opportunity", 
        "safe", "risky", "should", "i", "invest", "investing", "investment", "investments",
        "how", "why", "where", "can", "do", "does", "did", "would", "could", "will",
        "performance", "valuation", "dividend", "dividends", "debt", "earnings", "revenue",
        "guidance", "target", "opinion", "recommendation", "advice", "rating", "ratings",
        "score", "scores", "sentiment", "news", "history", "forecast", "projection", "projections"
    }

    # Clean and resolve each part
    for part in parts:
        cleaned_part = re.sub(r"[^\w\s.-]", "", part)
        words = cleaned_part.split()
        filtered_words = [w for w in words if w.lower() not in search_ignored]

        if not filtered_words:
            continue

        segment = " ".join(filtered_words).strip()
        segment_upper = segment.upper()

        # 1. Check if it's explicitly structured as an exchange ticker (e.g. RELIANCE.NS, 7203.T, EMAAR.AE)
        if re.match(r"^[A-Z0-9.-]+\.[A-Z0-9]{1,4}$", segment_upper):
            discovered.append(segment_upper)
            continue

        # 2. Dynamic Yahoo Finance Search Lookup
        resolved_ticker = await _search_yahoo_ticker(segment)
        if resolved_ticker:
            discovered.append(resolved_ticker)
        else:
            # Fallback to the first filtered word itself so yfinance fallback simulation works
            discovered.append(filtered_words[0].upper())

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


def create_master_agent(llm: str) -> "Agent":
    """
    Factory: build the production CrewAI Investment Committee Chair (Master Agent).
    """
    from crewai import Agent

    logger.info("Initializing CrewAI Master Agent with model=%s", llm)
    return Agent(
        role="Investment Committee Chair",
        goal=(
            "Synthesize conflicting opinions from the specialist analysts into a unified, "
            "decisive, and strictly formatted JSON final verdict. "
            "You MUST return your findings as a single valid JSON object with exactly this schema:\n"
            "{\n"
            '  "recommendation": "Buy|Hold|Sell",\n'
            '  "target_bias": "String describing upside/downside",\n'
            '  "summary": "1 paragraph executive summary",\n'
            '  "thesis": ["point 1", "point 2", "point 3"],\n'
            '  "action_items": ["action 1", "action 2", "action 3"]\n'
            "}\n"
            "Do NOT wrap the JSON in markdown code fences. Return ONLY the raw JSON object."
        ),
        backstory=(
            "You are the authoritative voice of the investment committee. You listen to the fundamental analyst, "
            "the technician, and the risk officer, and you make the hard final call: Buy, Hold, or Sell. "
            "You are strict about output formats and never produce markdown wrappers, only pure JSON."
        ),
        llm=llm,
        verbose=False,
        memory=True,
        max_iter=15,
        max_rpm=10,
        cache=True,
        allow_delegation=True,  # master delegates to specialists
    )
