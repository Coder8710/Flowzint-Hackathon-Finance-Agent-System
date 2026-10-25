from __future__ import annotations

import asyncio
import re
import logging

from app.agents.fundamental import FundamentalAnalysisAgent
from app.agents.debate import DebateSystem
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
        self.debate_system = DebateSystem()

    async def analyze(self, request: AnalysisRequest) -> AnalysisResponse:
        # Fast path: frontend sent a pre-resolved ticker — skip query parsing entirely
        if request.symbol:
            symbols = [request.symbol]
        else:
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
        action_items = _action_items(symbol, recommendation, risk_score, agents)

        analysis = CompanyAnalysis(
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
            currency=snapshot.currency,
        )

        # CrewAI synthesis and the judge use the same completed specialist report.
        # Run them together so the user does not wait for two serial LLM pipelines.
        crew_task = asyncio.create_task(asyncio.to_thread(
            self.finance_crew.run,
            snapshot,
            agents,
            news_items,
            request.risk_tolerance,
            request.horizon,
            request.portfolio_context,
        ))
        debate_task = asyncio.create_task(
            asyncio.to_thread(self.debate_system.run, analysis.model_copy(deep=True))
        )

        try:
            crew_result = await crew_task
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
                            data={**a.data, **data_dict}
                        ))
                    else:
                        dynamic_agents.append(a)
                agents = dynamic_agents
                composite = _weighted_score(agents)
        except Exception as exc:
            logger.info("CrewAI committee synthesis skipped: %s. Using deterministic fallback.", exc)


        analysis.recommendation = recommendation
        analysis.risk_score = risk_score
        analysis.target_bias = target_bias
        analysis.thesis = thesis
        analysis.action_items = action_items
        analysis.agents = agents
        analysis.confidence = round(min(0.92, max(0.45, abs(composite - 50) / 70 + 0.48)), 2)
        analysis.debate = await debate_task
        analysis.debate.source_recommendation = recommendation
        analysis.debate.source_confidence = analysis.confidence
        analysis.recommendation = {
            "Buy": "Buy",
            "Sell": "Sell",
            "Neutral": "Hold",
        }[analysis.debate.verdict]
        analysis.confidence = analysis.debate.confidence
        return analysis


async def _search_yahoo_ticker(query_str: str) -> str | None:
    """Query Yahoo Finance Search API to find the best matching stock ticker in US, India, Japan, China, or Dubai."""
    # Manual overrides for popular/ambiguous ticker terms
    overrides = {
        "bse": "BSE.NS",
        "bse share": "BSE.NS",
        "bse limited": "BSE.NS",
        "bombay stock exchange": "BSE.NS",
        "bombay stock exchange limited": "BSE.NS",
        "sensex": "^BSESN",
        "nifty": "^NSEI",
        "nifty 50": "^NSEI",
        "nifty50": "^NSEI",
    }
    q_clean = query_str.strip().lower()
    if q_clean in overrides:
        return overrides[q_clean]

    from curl_cffi import requests as requests_cffi
    from urllib.parse import quote_plus
    import asyncio

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

    ACCEPTED_QTYPES = {"EQUITY", "ETF", "MUTUALFUND", "INDEX", "FUTURE", "CURRENCY", "CRYPTOCURRENCY"}

    def run_cffi(q: str):
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={quote_plus(q)}&quotesCount=8&newsCount=0"
        return requests_cffi.get(url, headers=headers, impersonate="chrome", timeout=5)

    async def do_search(q: str) -> str | None:
        try:
            response = await asyncio.to_thread(run_cffi, q)
            if response.status_code == 200:
                data = response.json()
                quotes = data.get("quotes", [])

                # Priority 1: Indian listings (.NS, .BO, NSE, BSE)
                for quote in quotes:
                    symbol = quote.get("symbol")
                    exch = quote.get("exchange")
                    qtype = quote.get("quoteType")
                    if symbol and qtype in ACCEPTED_QTYPES:
                        if symbol.upper().endswith((".NS", ".BO")) or (exch and exch.upper() in ("NSE", "BSE")):
                            return symbol

                # Priority 2: Other target countries (by exchange or symbol suffix)
                for quote in quotes:
                    symbol = quote.get("symbol")
                    exch = quote.get("exchange")
                    qtype = quote.get("quoteType")
                    if symbol and qtype in ACCEPTED_QTYPES:
                        if exch in TARGET_EXCHANGES or symbol.endswith(TARGET_SUFFIXES):
                            return symbol

                # Priority 3: Any general accepted type
                for quote in quotes:
                    symbol = quote.get("symbol")
                    qtype = quote.get("quoteType")
                    if symbol and qtype in ACCEPTED_QTYPES:
                        return symbol

                # Priority 4: First available symbol of any type
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
    """Build explanatory, evidence-grounded thesis pillars for the fallback report."""
    pillars: list[str] = []

    for agent in agents:
        name = agent.agent
        data = agent.data or {}
        summary = agent.summary or "No summary was returned."
        signals = [str(item).strip() for item in (agent.signals or []) if str(item).strip()]

        if "Fundamental" in name:
            metrics = []
            for key, label in (("pe_ratio", "P/E"), ("revenue_growth", "revenue growth"),
                               ("profit_margin", "profit margin"), ("debt_to_equity", "debt-to-equity")):
                value = data.get(key)
                if value is None:
                    continue
                if key in {"revenue_growth", "profit_margin"}:
                    value = f"{float(value) * 100:.1f}%"
                metrics.append(f"{label}: {value}")
            evidence = "; ".join(metrics) or "; ".join(signals[:3]) or "fundamental data is limited"
            pillars.append(
                f"Fundamental picture: {summary} The available evidence includes {evidence}. "
                "These measures describe recent business performance and valuation, but they do not alone establish fair value or guarantee future growth. "
                "P/E compares the share price with current earnings, while revenue growth shows sales expansion rather than the amount of cash ultimately earned. "
                "Margins help test whether growth is profitable, and debt affects how much flexibility the company has if conditions weaken. "
                "Use the strongest positive and negative measures together, then check whether upcoming reported results continue to support the investment case. "
                "Where peer comparisons or cash-flow measures are unavailable, treat the valuation conclusion as uncertain and seek that evidence before relying on it."
            )

        elif "Technical" in name:
            trend = data.get("trend_direction", "unclear")
            signal = data.get("signal", "wait")
            rsi = data.get("rsi_reading", data.get("rsi_14"))
            support = data.get("key_support")
            resistance = data.get("key_resistance")
            levels = []
            if rsi is not None: levels.append(f"RSI is {rsi}")
            if support is not None: levels.append(f"support is {support}")
            if resistance is not None: levels.append(f"resistance is {resistance}")
            if data.get("sma_20") is not None and data.get("sma_50") is not None:
                levels.append(f"20-day and 50-day averages are {data['sma_20']} and {data['sma_50']}")
            indicator_text = "; ".join(levels) or "; ".join(signals[:3]) or "indicator and price-level data are limited"
            pillars.append(
                f"Technical picture: {summary} The measured trend is {trend} and the current signal is {signal}; {indicator_text}. "
                "A sustained move above resistance or a confirmed improving trend would strengthen the setup, while a break below support would weaken it. "
                "RSI describes recent momentum; a high or low reading can persist and does not by itself predict a reversal. "
                "Moving averages help show trend direction but react after prices have moved, so combine them with current price behavior and company evidence. "
                "Treat these levels as checkpoints that can change with new prices, and use them to plan entries and risk limits rather than as guaranteed predictions. "
                "Reassess the setup if price action contradicts the signal or if fresh data changes the support and resistance zones."
            )

        elif "News" in name:
            score = data.get("score", data.get("sentiment_score", 50))
            headline_text = "; ".join(signals[:3]) or summary
            pillars.append(
                f"News and catalysts: {summary} The most relevant available reports are: {headline_text}. The news score is {score}/100 and summarizes direction, not the size or certainty of a future effect. "
                "A headline may describe an event without showing its effect on revenue, margins, or cash flow, and early reports can omit important context. "
                "Check the original announcement, its date and source, and whether company guidance or reported results confirm the expectation it creates. "
                "Until that evidence arrives, treat the catalyst as a factor to monitor rather than a confirmed change in value. "
                "If later information disagrees with the headline, update the thesis using the newer, more direct evidence."
            )

        elif "Sentiment" in name:
            score = data.get("sentiment_score", data.get("score", 50))
            mood = data.get("fear_greed_proxy", "neutral")
            contrarian = data.get("contrarian_signal", False)
            signal_text = "; ".join(signals[:3]) or f"market mood is {mood} with a sentiment score of {score}/100"
            contrarian_text = (
                "A contrarian signal is present, which can mean crowded positioning may amplify a reversal."
                if contrarian else "No contrarian signal was detected in the available data."
            )
            pillars.append(
                f"Market sentiment: {summary} The reported signals are {signal_text}. {contrarian_text} "
                "Sentiment describes market attention and positioning, not the company's intrinsic value or future returns, and social or survey signals can be noisy. "
                "A crowded positive mood can leave less room for favorable surprises, while a very negative mood can persist if business results deteriorate. "
                "Use it as context, identify what evidence could change the mood, and look for confirmation from financial results and price action before changing an investment view. "
                "If the sentiment feed is incomplete, place less weight on it and prioritize verifiable company information."
            )

        elif "Risk" in name:
            score = int(data.get("risk_score", 50))
            risks = data.get("risks") or signals
            risk_text = "; ".join(str(item) for item in risks[:2]) or "No specific risk item was returned."
            level = "low" if score < 35 else "moderate" if score < 65 else "elevated"
            pillars.append(
                f"Risk picture: {summary} The measured risk level is {level} ({score}/100), with these reported concerns: {risk_text}. "
                "A higher score calls for stronger evidence and tighter limits on exposure; it is a screening signal, not a prediction that a loss will occur. "
                "Separate risks that may affect long-term business value from short-term price volatility, since they call for different responses. "
                "Before acting, consider how each concern could affect the thesis, how much loss the position could create, and what evidence would make you reduce exposure or reassess it. "
                "Review the risk items again when material company news or updated financial data becomes available."
            )

        elif "Portfolio" in name:
            score = data.get("fit_score", 50)
            advice = data.get("allocation_advice") or summary
            rationale = data.get("rationale") or signals
            rationale_text = "; ".join(str(item) for item in rationale[:2]) or "No additional portfolio rationale was provided."
            pillars.append(
                f"Portfolio fit: The suitability score is {score}/100. {advice} Supporting considerations include {rationale_text}. "
                "This assessment depends on the stated risk tolerance, investment horizon, and any portfolio context supplied by the user. "
                "A fit score does not account for holdings or obligations that were not provided, and it cannot guarantee that an allocation is appropriate in every market condition. "
                "Compare the suggested exposure with existing positions in the same sector and with the time available to recover from a decline. "
                "Treat the suggested allocation as a starting point and keep the position sized so that a downside scenario would not overwhelm the rest of the portfolio."
            )

    return pillars[:6]


def _action_items(symbol: str, recommendation: str, risk_score: int, agents: list) -> list[str]:
    """Create useful, multi-sentence steps when the LLM committee is unavailable."""
    tech_data = next((agent.data for agent in agents if "Technical" in agent.agent), {})
    fund_data = next((agent.data for agent in agents if "Fundamental" in agent.agent), {})
    port_data = next((agent.data for agent in agents if "Portfolio" in agent.agent), {})
    support = tech_data.get("key_support")
    resistance = tech_data.get("key_resistance")
    intrinsic = fund_data.get("intrinsic_value_estimate")
    strategy = str(port_data.get("entry_strategy", "staged entry")).replace("_", " ")

    if recommendation == "Sell":
        first = (
            f"Reduce or exit: Review the {symbol} position for reduction or exit in light of the Sell assessment. "
            "Compare the original reason for owning it with the current fundamental and technical evidence, and avoid adding exposure until the thesis is reassessed. "
            "Record which new evidence would change this decision, and check whether the risk and price signals that prompted the Sell view remain present."
        )
    elif recommendation == "Buy":
        level_note = f"Use support near {support} as a review zone" if support is not None else "Wait for a clear entry level to be established from current price data"
        first = (
            f"Stage entry: Plan any new {symbol} position using the portfolio agent's {strategy} approach. {level_note}; do not commit the full intended allocation at once or chase a sharp move. "
            "This staged approach reduces timing risk while leaving room to add only if the evidence and entry conditions remain supportive. Recheck the latest price and thesis before each tranche."
        )
    else:
        first = (
            f"Wait for confirmation: Keep {symbol} on a watchlist and wait for clearer confirmation before opening or increasing a position. "
            "Look for improving company evidence alongside a technical signal that supports the thesis; a single positive headline is not enough. "
            "Revisit the decision when one of those conditions changes, and compare the new evidence with the reason for the current Hold view."
        )

    items = [first]
    risk_signals = next((agent.signals for agent in agents if "Risk" in agent.agent), [])
    risk_detail = "; ".join(str(item) for item in risk_signals[:2]) or "the risk factors identified in the report"
    items.append(
        f"Risk limits: Set a position-size limit and a clear reassessment or stop level before acting; the current risk score is {risk_score}/100. "
        f"Account for {risk_detail}. If the chosen level is reached, review the thesis and exposure instead of making an impulsive decision. "
        "Write down the trigger in advance so the response is consistent with the risk tolerance used in this report."
    )

    if resistance is not None:
        items.append(
            f"Manage upside: At resistance near {resistance}, reassess the risk/reward and whether the original upside case still has room to play out. "
            "If the price stalls or the evidence weakens, consider whether to pause additional buying or protect gains; do not treat resistance as a guaranteed target. "
            "Compare the move with the original thesis and review the next available company update before changing the position."
        )
    elif intrinsic and intrinsic != "N/A":
        items.append(
            f"Check valuation: Compare the current market price with the report's screening estimate of {intrinsic} and review the assumptions behind it. "
            "The estimate is a reference point, not a precise fair value; check whether revenue, margins, and debt evidence justify any apparent gap before acting. "
            "If those inputs are stale or incomplete, wait for updated figures rather than treating the estimate as a price target."
        )
    else:
        items.append(
            "Earnings check: Review the next available company results for changes in revenue, margins, and management guidance. "
            "Compare those results with the evidence supporting the current view, and wait for a measurable improvement or deterioration before changing the plan. "
            "Note which figure changed and whether the change affects the original investment rationale."
        )

    if intrinsic and intrinsic != "N/A" and len(items) < 4:
        items.append(
            f"Check valuation: Compare the market price with the screening estimate of {intrinsic}, then check the underlying growth and profitability evidence. "
            "A difference alone is not a buy or sell signal; confirm that the assumptions behind the estimate remain reasonable. "
            "If the required data is missing or outdated, record that limitation and defer a valuation-based decision until it can be checked."
        )
    elif not intrinsic or intrinsic == "N/A":
        items.append(
            "Review valuation using the company's reported earnings, revenue trend, and profitability when those figures become available. "
            "The report has no reliable intrinsic-value estimate, so avoid treating an unsupported target as a decision point; compare the next results with current expectations instead."
        )
    items.append(
        f"Thesis break: Recheck the {symbol} thesis when new results or material company news arrive. "
        "If the financial evidence deteriorates, the expected catalyst fails to appear, or the key technical level breaks, document which assumption changed and reassess the position before taking the next step."
        " Compare the new evidence with the original case so the decision reflects what changed rather than the share-price move alone."
    )
    return items[:5]

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
            '  "thesis": ["140-170 word point 1", "140-170 word point 2", "140-170 word point 3", "140-170 word point 4", "140-170 word point 5", "140-170 word point 6"],\n'
            '  "action_items": ["Short title: 85-110 word explanation 1", "Short title: explanation 2", "Short title: explanation 3", "Short title: explanation 4", "Short title: explanation 5"]\n'
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
        memory=False,
        max_iter=6,
        max_rpm=10,
        cache=True,
        allow_delegation=True,  # master delegates to specialists
    )
