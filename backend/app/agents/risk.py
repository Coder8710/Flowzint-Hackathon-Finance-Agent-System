import logging
import math

from app.models.analysis import AgentFinding
from app.services.finance_data import MarketSnapshot

logger = logging.getLogger(__name__)


class RiskAnalysisAgent:
    name = "Risk Analysis Agent"

    async def run(self, snapshot: MarketSnapshot) -> AgentFinding:
        closes = [float(row["close"]) for row in snapshot.history if "close" in row]
        returns = [float((current - previous) / previous) for previous, current in zip(closes, closes[1:]) if previous]
        volatility = _stdev(returns) * (252**0.5) if len(returns) > 2 else 0.25
        drawdown = _max_drawdown(closes)

        risk = 35
        signals: list[str] = []
        if volatility > 0.55:
            signals.append(f"Annualized volatility is high near {volatility * 100:.1f}%.")
            risk += 22
        elif volatility < 0.28:
            signals.append(f"Annualized volatility is moderate near {volatility * 100:.1f}%.")
            risk -= 6
        else:
            signals.append(f"Annualized volatility is elevated near {volatility * 100:.1f}%.")
            risk += 8

        if drawdown < -0.25:
            signals.append(f"Recent max drawdown is steep at {drawdown * 100:.1f}%.")
            risk += 16
        elif drawdown > -0.1:
            signals.append(f"Recent max drawdown is contained at {drawdown * 100:.1f}%.")
            risk -= 5

        if snapshot.beta is not None:
            if snapshot.beta > 1.4:
                signals.append(f"Beta near {snapshot.beta:.2f} indicates above-market sensitivity.")
                risk += 10
            elif snapshot.beta < 0.9:
                signals.append(f"Beta near {snapshot.beta:.2f} indicates below-market sensitivity.")
                risk -= 5

        if snapshot.debt_to_equity is not None and snapshot.debt_to_equity > 130:
            signals.append("Leverage adds balance-sheet risk.")
            risk += 8

        avg_return = sum(returns) / len(returns) if returns else 0
        if avg_return < -0.002:
            risk += 6
            signals.append("Average daily return has recently skewed negative.")

        risk = max(0, min(100, int(round(risk))))
        level = "high" if risk >= 67 else "low" if risk <= 35 else "medium"
        return AgentFinding(
            agent=self.name,
            summary=f"Risk profile is {level} with a score of {risk}/100.",
            confidence=0.73,
            signals=signals,
            data={"score": 100 - risk, "risk_score": risk, "volatility": volatility, "max_drawdown": drawdown},
        )


def _stdev(data: list[float]) -> float:
    """Manual standard deviation to avoid Python 3.12 statistics.stdev incompatibility with numpy floats."""
    n = len(data)
    if n < 2:
        return 0.0
    mean_val = sum(data) / n
    variance = sum((x - mean_val) ** 2 for x in data) / (n - 1)
    return math.sqrt(variance)


def _max_drawdown(values: list[float]) -> float:
    if not values:
        return 0
    peak = values[0]
    worst = 0.0
    for value in values:
        peak = max(peak, value)
        worst = min(worst, (value - peak) / peak)
    return worst


def create_risk_agent(llm: str, search_tool) -> "Agent":
    """
    Factory: build the production CrewAI Risk Analysis Agent.
    """
    from crewai import Agent

    logger.info("Initializing CrewAI Risk Agent with model=%s", llm)
    return Agent(
        role="Chief Risk Officer (CRO)",
        goal=(
            "Identify, quantify, and rank every material risk that could cause a permanent loss of "
            "capital for an investor holding this stock over the next 6-24 months. Your analysis "
            "must be forensic, adversarial, and structured. Follow this risk taxonomy:\n\n"
            "CATEGORY 1 — BUSINESS RISK: What could destroy the company's competitive moat? "
            "Check: new disruptive competitors entering the market, key customer concentration risk "
            "(does one customer > 30% of revenue?), technology obsolescence risk, management "
            "credibility risk (recent CEO/CFO departure, fraud allegations, audit qualifications).\n\n"
            "CATEGORY 2 — FINANCIAL RISK: Could the balance sheet cause insolvency? "
            "Check: Debt-to-Equity ratio vs sector median, interest coverage ratio, upcoming debt "
            "maturities in next 12-24 months, free cash flow adequacy to service debt, "
            "promoter pledging levels for Indian stocks (above 50% is a critical warning).\n\n"
            "CATEGORY 3 — REGULATORY & LEGAL RISK: Is there a regulatory sword hanging over the company? "
            "Check: active SEC/SEBI enforcement actions, ongoing litigation with material outcomes, "
            "sector-level regulatory changes (new emission standards, pricing controls, license risk), "
            "government policy risk for government-linked companies.\n\n"
            "CATEGORY 4 — MACRO & MARKET RISK: Would a market-wide shock hurt this stock more than others? "
            "Check: beta relative to index, sector sensitivity to interest rate changes (high-PE growth "
            "stocks suffer most from rate hikes), currency risk for exporters/importers, commodity "
            "input price risk (e.g., steel prices for auto manufacturers), geopolitical risk.\n\n"
            "CATEGORY 5 — LIQUIDITY RISK: Can an investor exit without significant slippage? "
            "Check: average daily trading volume (ADV), market cap tier (micro-cap < $50M / ₹500Cr "
            "is a liquidity risk), bid-ask spread quality, institutional ownership percentage.\n\n"
            "TAIL RISK SCENARIO: Describe the single worst-case scenario that could cause a >40% "
            "drawdown from current price. Make it specific and realistic — not generic.\n\n"
            "You MUST return your findings as a single valid JSON object with exactly this schema:\n"
            "{\n"
            '  "risks": ["risk1", "risk2", "risk3"],\n'
            '  "risk_score": X,\n'
            '  "risk_level": "low|medium|high|critical",\n'
            '  "tail_risk_scenario": "single worst-case scenario description",\n'
            '  "liquidity_risk": "low|medium|high",\n'
            '  "regulatory_risk": "none|low|medium|high",\n'
            '  "financial_stress_risk": "none|low|medium|high",\n'
            '  "key_risk_categories": ["business", "financial", "regulatory", "macro", "liquidity"]\n'
            "}\n"
            "Do NOT wrap the JSON in markdown code fences. Return ONLY the raw JSON object."
        ),
        backstory=(
            "You are a paranoid but brilliantly effective Chief Risk Officer who has survived the "
            "2008 financial crisis, the 2020 COVID crash, and multiple individual stock blowups. "
            "Your core philosophy: 'The riskiest-looking assets are often safe, and the safest-looking "
            "assets are often the riskiest. Your job is to find the hidden trapdoor.'\n\n"
            "You operate like a forensic short-seller: you specifically search for things the "
            "bulls are ignoring. You start every analysis by asking: 'What is the bear case that "
            "could make me lose 50% of my money?' You are NOT trying to find reasons not to invest — "
            "you are trying to ensure any investment is made with EYES OPEN to the full risk picture.\n\n"
            "Your mandatory checklist for every analysis:\n"
            "1. SEC EDGAR (for US stocks) or BSE/NSE filings (for Indian stocks): Any material "
            "adverse events, audit qualifications, restatements, or going-concern warnings?\n"
            "2. Promoter pledge levels (Indian stocks ONLY): If promoter pledging > 30%, flag as "
            "HIGH RISK. Above 50% is CRITICAL — forced selling by lenders can devastate the stock.\n"
            "3. Debt maturity wall: Are there large debt repayments due in the next 12-24 months? "
            "Is the company's FCF sufficient to cover them without refinancing?\n"
            "4. Competitive threat check: Search for new entrants, substitute products, or "
            "pricing pressure news from the last 6 months.\n"
            "5. Regulatory action scan: Search for any SEBI orders, SEC enforcement actions, "
            "government notices, or competition commission probes.\n"
            "6. Liquidity check: Average daily volume < $1M USD (or < ₹10 Cr for Indian stocks) "
            "is a liquidity red flag for any position above starter size.\n\n"
            "CRITICAL CONSTRAINT: You NEVER assign a risk_score below 20 — every investment "
            "has risk. And you NEVER assign a risk_score above 95 — even deeply distressed companies "
            "can recover. Your risk_score represents the probability of permanent capital impairment "
            "on a 0-100 scale."
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
