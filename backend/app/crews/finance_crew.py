# Flowzint Finance Agent System — crews/finance_crew.py — Production Ready

"""
CrewAI crew orchestration for the Flowzint Finance Agent System.

Upgrades over the original implementation:
  - All agents use bounded production kwargs (verbose=False, memory=True, max_iter=6,
    max_rpm=10, cache=True, allow_delegation=False)
  - Agent definitions are imported from agent factory functions
  - Tasks have structured JSON expected_output schemas
  - Context chaining: fundamental_task and technical_task get context=[news_task],
    sentiment_task gets context=[news_task, fundamental_task, technical_task]
  - Sequential process instead of hierarchical (deterministic execution order)
  - Logging via Python logging module instead of stdout
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from app.core.config import get_settings
from app.models.analysis import AgentFinding, NewsItem
from app.services.finance_data import MarketSnapshot

logger = logging.getLogger(__name__)


class CrewAIUnavailableError(RuntimeError):
    """Raised when CrewAI cannot run in the current environment."""


def resolve_llm(settings):
    """
    Return the LiteLLM model identifier (string) or LLM object for CrewAI agents.

    When CREWAI_MODEL starts with ``bedrock_mantle/``, a local SigV4 signing
    proxy is started in a daemon thread on port 8099.  CrewAI is then pointed
    at ``openai/<model-id>`` with the proxy as its base_url, so LiteLLM routes
    all calls through the proxy which signs and forwards them to:
        https://bedrock-mantle.<region>.api.aws/v1
    """
    if settings.is_bedrock_mantle:
        from app.services.mantle_proxy import start_mantle_proxy
        from crewai import LLM  # crewai re-exports LLM; requires litellm to be installed

        proxy_base_url = start_mantle_proxy(
            region=settings.aws_region_name or "us-east-1",
            access_key=settings.aws_access_key_id or "",
            secret_key=settings.aws_secret_access_key or "",
        )
        model_id = settings.bedrock_mantle_model_id  # e.g. moonshotai.kimi-k2.5
        os.environ["OPENAI_API_KEY"] = "mantle-proxy"
        os.environ["OPENAI_API_BASE"] = proxy_base_url
        logger.info(
            "Routing LLM calls through Mantle proxy: openai/%s via %s",
            model_id, proxy_base_url,
        )
        return LLM(
            model=f"openai/{model_id}",
            base_url=proxy_base_url,
            api_key="mantle-proxy",  # proxy handles real auth; dummy key required by LiteLLM
        )
    if settings.gemini_api_key and settings.crewai_model.startswith("bedrock/"):
        return "gemini/gemini-flash-latest"
    if settings.openai_api_key and settings.crewai_model.startswith("bedrock/"):
        return "openai/gpt-4o"
    # All other providers (openai, openrouter, bedrock, gemini …) — pass through as-is
    return settings.crewai_model


class FinanceCrew:
    """CrewAI implementation of the multi-agent stock analyst team."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def run(
        self,
        snapshot: MarketSnapshot,
        specialist_findings: list[AgentFinding],
        news_items: list[NewsItem],
        risk_tolerance: str,
        horizon: str,
        portfolio_context: str | None,
    ) -> dict[str, Any]:
        if not self.settings.has_llm_key:
            raise CrewAIUnavailableError("CrewAI requires a configured LLM provider and credentials.")

        if self.settings.openai_api_key:
            os.environ["OPENAI_API_KEY"] = self.settings.openai_api_key
        if self.settings.gemini_api_key:
            os.environ["GEMINI_API_KEY"] = self.settings.gemini_api_key
        if self.settings.openrouter_api_key:
            os.environ["OPENROUTER_API_KEY"] = self.settings.openrouter_api_key
        if self.settings.aws_access_key_id:
            os.environ["AWS_ACCESS_KEY_ID"] = self.settings.aws_access_key_id
        if self.settings.aws_secret_access_key:
            os.environ["AWS_SECRET_ACCESS_KEY"] = self.settings.aws_secret_access_key
        if self.settings.aws_region_name:
            os.environ["AWS_REGION_NAME"] = self.settings.aws_region_name
        if self.settings.tavily_api_key:
            os.environ["TAVILY_API_KEY"] = self.settings.tavily_api_key

        try:
            from crewai import Agent, Crew, Process, Task
            from crewai_tools import ScrapeWebsiteTool, TavilySearchTool
        except Exception as exc:
            raise CrewAIUnavailableError(f"CrewAI import failed: {exc}") from exc

        # -----------------------------------------------------------------
        # Import production agent factories
        # -----------------------------------------------------------------
        from app.agents.fundamental import create_fundamental_agent
        from app.agents.news import create_news_agent
        from app.agents.sentiment import create_sentiment_agent
        from app.agents.technical import create_technical_agent
        from app.agents.risk import create_risk_agent
        from app.agents.portfolio import create_portfolio_agent
        from app.agents.master import create_master_agent

        if not self.settings.tavily_api_key and not os.environ.get("TAVILY_API_KEY"):
            raise CrewAIUnavailableError("Tavily API key is missing. Live search is unavailable.")

        try:
            search_tool = TavilySearchTool()
            scrape_tool = ScrapeWebsiteTool()
        except Exception as exc:
            raise CrewAIUnavailableError(f"Failed to initialize search/scrape tools: {exc}") from exc

        llm = resolve_llm(self.settings)
        logger.info("Building production CrewAI agents for %s", snapshot.symbol)

        # -----------------------------------------------------------------
        # Production agents via factory functions
        # -----------------------------------------------------------------
        news_agent = create_news_agent(llm, search_tool, scrape_tool)
        fundamental_agent = create_fundamental_agent(llm, search_tool, scrape_tool)
        technical_agent = create_technical_agent(llm, search_tool)
        sentiment_agent = create_sentiment_agent(llm, search_tool)
        risk_agent = create_risk_agent(llm, search_tool)
        portfolio_agent = create_portfolio_agent(llm)
        master_agent = create_master_agent(llm)

        # -----------------------------------------------------------------
        # Evidence payload
        # -----------------------------------------------------------------
        evidence = _evidence_payload(
            snapshot=snapshot,
            specialist_findings=specialist_findings,
            news_items=news_items,
            risk_tolerance=risk_tolerance,
            horizon=horizon,
            portfolio_context=portfolio_context,
        )
        context = f"Use ONLY this structured evidence payload to ground your analysis. Do not hallucinate metrics:\n{json.dumps(evidence, indent=2)}"

        # -----------------------------------------------------------------
        # Tasks with structured JSON expected_output and context chaining
        # -----------------------------------------------------------------
        news_task = Task(
            description=(
                f"{context}\n\n"
                f"NEWS RESEARCH TASK for {snapshot.symbol} ({snapshot.company_name}):\n"
                f"The evidence payload contains {len(news_items)} pre-fetched news headlines. "
                f"Use them as your starting point, then conduct additional web research.\n\n"
                f"MANDATORY RESEARCH STEPS:\n"
                f"Step 1: Read all news items in the 'news' array of the evidence payload. "
                f"Identify the single most market-moving headline.\n"
                f"Step 2: Search the web for '{snapshot.company_name} earnings results' or "
                f"'{snapshot.symbol} quarterly results' to find the most recent earnings report. "
                f"Compare actual results vs analyst consensus estimates.\n"
                f"Step 3: Search '{snapshot.company_name} SEC filing' or "
                f"'{snapshot.company_name} BSE filing SEBI' (for Indian stocks) for any recent "
                f"material event disclosures (8-K equivalent, quarterly results, key management changes).\n"
                f"Step 4: Search '{snapshot.company_name} analyst upgrade downgrade' to find "
                f"any recent rating changes. Note the analyst firm, old rating, new rating, and price target.\n"
                f"Step 5: Search '{snapshot.company_name} insider buying selling' for any "
                f"recent director/officer purchases or sales of shares.\n"
                f"Step 6: Cross-reference your findings against Tier 1 authoritative sources "
                f"(Reuters, Bloomberg, SEC EDGAR, BSE India filings). Filter out unverified rumors "
                f"and social media speculation — label them as such.\n"
                f"Step 7: Assign a catalyst severity tier: tier1_critical (earnings/filing), "
                f"tier2_high (analyst rating change, M&A), tier3_medium (management comment, "
                f"macro data), tier4_noise (social media, blogs). Base your confidence_score on tier.\n\n"
                f"Return ONLY valid raw JSON — no markdown wrappers."
            ),
            expected_output=(
                'A single valid JSON object: {"headline_summary": "...", '
                '"catalyst_type": "earnings|guidance_revision|analyst_rating|regulatory|geopolitical|M&A|macro|insider_trade|none", '
                '"catalyst_severity": "tier1_critical|tier2_high|tier3_medium|tier4_noise|none", '
                '"impact_direction": "strongly_bullish|bullish|neutral|bearish|strongly_bearish", '
                '"earnings_surprise_pct": null or number, '
                '"guidance_revision": "raised|lowered|maintained|not_applicable", '
                '"confidence_score": 0-100, "sources": ["url1", "url2"]}'
            ),
            agent=news_agent,
            async_execution=False,
        )
        fundamental_task = Task(
            description=(
                f"{context}\n\n"
                f"FUNDAMENTAL ANALYSIS TASK for {snapshot.symbol} ({snapshot.company_name}):\n"
                f"The evidence payload contains key financial metrics: "
                f"price={snapshot.price}, pe_ratio={snapshot.pe_ratio}, "
                f"revenue_growth={snapshot.revenue_growth}, profit_margin={snapshot.profit_margin}, "
                f"debt_to_equity={snapshot.debt_to_equity}, market_cap={snapshot.market_cap}.\n"
                f"Use these as your starting data points and research any missing values.\n\n"
                f"MANDATORY RESEARCH STEPS:\n"
                f"Step 1: Evaluate every ratio in the evidence payload. Classify each as "
                f"'strong / neutral / weak' relative to the company's sector peers.\n"
                f"Step 2: Search '{snapshot.company_name} revenue profit margin quarterly results' "
                f"to verify and supplement the financial metrics in the evidence payload.\n"
                f"Step 3: Run a DCF valuation. Use the revenue_growth from evidence as your 5-year "
                f"growth rate assumption (or find analyst consensus if unavailable). Apply WACC of "
                f"10-12% for US blue-chips, 12-14% for Indian/Asian mid-caps, 14-16% for small-caps. "
                f"Use a terminal growth rate of 2.5-3% for stable companies, 1-2% for cyclicals.\n"
                f"Step 4: Search '{snapshot.company_name} competitors peer comparison EV EBITDA' "
                f"to find 2-3 direct competitors and their valuation multiples for comparison.\n"
                f"Step 5: Search '{snapshot.company_name} annual report management quality "
                f"promoter pledging insider ownership' to assess business quality and management trust.\n"
                f"Step 6: Search '{snapshot.company_name} auditor change restatement related party "
                f"red flag' to identify any forensic accounting red flags.\n"
                f"Step 7: Determine the economic moat rating: wide (ROIC consistently > 15% for 5+ years), "
                f"narrow (some competitive advantage but erosion risk), none (commodity business with no pricing power).\n"
                f"Step 8: Make a final recommendation: buy (>15% upside vs DCF), hold (within 10%), "
                f"sell (overvalued by >15%), avoid (fundamental deterioration).\n\n"
                f"Mark any metric you cannot source as null. Return ONLY valid raw JSON."
            ),
            expected_output=(
                'A single valid JSON object: {"intrinsic_value_estimate": "$X or ₹X", '
                '"current_price_premium_discount_pct": "X% premium or X% discount", '
                '"dcf_wacc_used_pct": X, "terminal_growth_rate_pct": X, '
                '"key_metrics": {"pe_ratio": X, "ev_ebitda": X, "fcf_yield_pct": X, "roic_pct": X, "debt_to_equity": X}, '
                '"peer_comparison": [{"name": "PeerCo", "pe": X, "ev_ebitda": X}], '
                '"moat_rating": "wide|narrow|none", '
                '"red_flags": ["flag1"] or [], '
                '"recommendation": "buy|hold|sell|avoid"}'
            ),
            agent=fundamental_agent,
            async_execution=False,
            context=[news_task],
        )
        technical_task = Task(
            description=(
                f"{context}\n\n"
                f"TECHNICAL ANALYSIS TASK for {snapshot.symbol} ({snapshot.company_name}):\n"
                f"The evidence payload contains 6 months of historical OHLCV data in the "
                f"'market_snapshot' section. The current price is {snapshot.price}. "
                f"Use this as your primary data source and supplement with web searches.\n\n"
                f"MANDATORY RESEARCH STEPS (Elder Triple Screen method):\n"
                f"SCREEN 1 — WEEKLY TREND: Search '{snapshot.symbol} weekly chart 13-week EMA trend' "
                f"to identify the primary market tide. Is it bullish, bearish, or sideways? "
                f"This establishes your DIRECTIONAL BIAS — only take trades aligned with this.\n"
                f"SCREEN 2 — DAILY SETUP: Search '{snapshot.symbol} daily chart RSI MACD "
                f"indicator reading' to find the current RSI (14), MACD histogram direction, "
                f"and Bollinger Band width. Look for an oversold RSI bounce in an uptrend, or "
                f"an overbought RSI rejection in a downtrend — that is your entry trigger.\n"
                f"SCREEN 3 — ENTRY TIMING: Search '{snapshot.symbol} key support resistance "
                f"level price action breakout' to identify the precise entry zone, stop loss "
                f"(below nearest key support), and price target (next key resistance).\n"
                f"VOLUME CHECK: Confirm that volume is expanding on price breakouts and "
                f"contracting on pullbacks. Search '{snapshot.symbol} volume OBV trend'.\n"
                f"PATTERN RECOGNITION: Identify any classical chart pattern if present: "
                f"Head & Shoulders, Double Top/Bottom, Bull/Bear Flag, Cup & Handle, Triangle.\n"
                f"RISK/REWARD: Calculate the risk-reward ratio = (Target - Entry) / (Entry - StopLoss). "
                f"Only recommend a 'buy' or 'sell' if R:R >= 2:1. Otherwise output 'wait'.\n\n"
                f"The news context from the news agent is provided — align technical signal with "
                f"fundamental news direction where possible.\n\n"
                f"Return ONLY valid raw JSON — no markdown wrappers."
            ),
            expected_output=(
                'A single valid JSON object: {"weekly_trend": "bullish|bearish|sideways", '
                '"daily_setup": "pullback_in_uptrend|consolidation|breakdown|no_clear_setup", '
                '"trend_direction": "uptrend|downtrend|sideways", '
                '"rsi_reading": X, "macd_signal": "bullish_cross|bearish_cross|neutral", '
                '"volume_confirmation": true|false, "volume_trend": "expanding|contracting|neutral", '
                '"chart_pattern": "name or none", '
                '"key_support": "$X or ₹X", "key_resistance": "$X or ₹X", '
                '"entry_zone": "$X-$Y or ₹X-₹Y", "stop_loss": "$X or ₹X", '
                '"target_price": "$X or ₹X", "risk_reward_ratio": X, '
                '"signal": "buy|sell|wait"}'
            ),
            agent=technical_agent,
            async_execution=False,
            context=[news_task],
        )
        sentiment_task = Task(
            description=(
                f"{context}\n\n"
                f"SENTIMENT ANALYSIS TASK for {snapshot.symbol} ({snapshot.company_name}):\n"
                f"You have the news, fundamental, and technical analyses from the previous agents "
                f"as context. Your job is to determine if the CROWD's current positioning "
                f"CONFIRMS or CONTRADICTS what the fundamentals and technicals say.\n\n"
                f"MANDATORY RESEARCH STEPS (weighted composite score):\n"
                f"Step 1 (40% weight): Search Barchart, CBOE, or Market Chameleon for "
                f"'{snapshot.symbol} put call ratio options'. For Indian stocks, search "
                f"'NSE {snapshot.symbol} options open interest put call ratio'. "
                f"Record the current put/call ratio value.\n"
                f"Step 2 (25% weight): Search Finviz or Ortex for '{snapshot.symbol} short interest "
                f"percent float'. For Indian stocks, search 'NSE short selling {snapshot.symbol}'. "
                f"Record the current short interest as a % of float.\n"
                f"Step 3 (20% weight): Search Reddit r/wallstreetbets r/stocks for '{snapshot.symbol}' "
                f"and StockTwits for the ticker sentiment. Count approximate bullish vs bearish posts. "
                f"Also check Twitter/X cashtag ${snapshot.symbol}. For Indian stocks, additionally "
                f"search r/IndiaInvestments and Moneycontrol community.\n"
                f"Step 4 (15% weight): Search Google Trends for '{snapshot.company_name} stock' to "
                f"check if retail search volume is spiking (a FOMO warning signal).\n"
                f"Step 5: Calculate a weighted composite sentiment score from -100 to +100 based "
                f"on the above four inputs. Positive = bullish crowd, negative = bearish crowd.\n"
                f"Step 6: Check for contrarian signal: if score > +70 (crowd too euphoric, "
                f"fade the crowd = bearish contrarian) or < -70 (crowd too panicked, "
                f"buy the fear = bullish contrarian). Between -30 and +30 = neutral, "
                f"do NOT use as an override signal.\n"
                f"Step 7: State explicitly whether this sentiment reading CONFIRMS the "
                f"fundamental/technical direction, CONFLICTS with it, or is NEUTRAL/irrelevant.\n\n"
                f"Return ONLY valid raw JSON — no markdown wrappers."
            ),
            expected_output=(
                'A single valid JSON object: {"sentiment_score": -100 to 100, '
                '"fear_greed_proxy": "extreme_fear|fear|neutral|greed|extreme_greed", '
                '"put_call_ratio": X or null, "short_interest_pct_float": X or null, '
                '"social_buzz_volume": "low|medium|high|viral", '
                '"social_sentiment_breakdown": {"bullish_pct": X, "bearish_pct": X, "neutral_pct": X}, '
                '"google_trends_signal": "normal|rising|spiking", '
                '"positioning_bias": "retail_long|institutional_short|balanced|mixed", '
                '"contrarian_signal": true|false, "contrarian_rationale": "..."}'
            ),
            agent=sentiment_agent,
            async_execution=False,
            context=[news_task, fundamental_task, technical_task],
        )
        risk_task = Task(
            description=(
                f"{context}\n\n"
                f"RISK ANALYSIS TASK for {snapshot.symbol} ({snapshot.company_name}):\n"
                f"The evidence payload shows: beta={snapshot.beta}, debt_to_equity={snapshot.debt_to_equity}, "
                f"market_cap={snapshot.market_cap}. You also have the news, fundamental, technical, "
                f"and sentiment findings from previous agents as additional context.\n\n"
                f"Your job is to be an adversarial devil's advocate. Assume the bulls are wrong. "
                f"Find every material reason this investment could cause permanent capital loss.\n\n"
                f"MANDATORY RESEARCH STEPS:\n"
                f"Step 1 (Business Risk): Search '{snapshot.company_name} competitors disruption "
                f"market share threat' to identify the top competitive risk. Is there a newer, "
                f"cheaper, or better-funded competitor threatening the core business?\n"
                f"Step 2 (Financial Risk): Use the debt_to_equity={snapshot.debt_to_equity} from "
                f"evidence payload. Search '{snapshot.company_name} debt maturity refinancing "
                f"interest coverage FCF' to determine if the balance sheet is a risk.\n"
                f"Step 3 (Regulatory/Legal Risk): Search '{snapshot.company_name} SEBI SEC regulatory "
                f"action lawsuit probe investigation' for any active government/regulatory risks.\n"
                f"Step 4 (India-specific): If this is an Indian company (ticker ends in .NS or .BO), "
                f"search '{snapshot.company_name} promoter pledge SEBI disclosure' to check if "
                f"promoters have pledged shares (a critical forced-selling risk above 30%).\n"
                f"Step 5 (Macro Risk): Given beta={snapshot.beta}, assess the sensitivity to broad "
                f"market shocks. Is this stock a high-beta amplifier of market downturns?\n"
                f"Step 6 (Liquidity Risk): Check the average daily trading volume relative to market_cap. "
                f"Low ADV relative to position size = significant execution risk on exit.\n"
                f"Step 7: Construct the TAIL RISK SCENARIO — describe the single worst-case event "
                f"chain that could cause a >40% drawdown. Be specific (not 'macro uncertainty').\n\n"
                f"Assign a risk_score from 0-100 (0 = no risk, 100 = near-certain total loss). "
                f"NEVER assign below 20 or above 95.\n\n"
                f"Return ONLY valid raw JSON — no markdown wrappers."
            ),
            expected_output=(
                'A single valid JSON object: {"risks": ["risk1", "risk2", "risk3"], '
                '"risk_score": X, "risk_level": "low|medium|high|critical", '
                '"tail_risk_scenario": "specific worst-case description", '
                '"liquidity_risk": "low|medium|high", '
                '"regulatory_risk": "none|low|medium|high", '
                '"financial_stress_risk": "none|low|medium|high", '
                '"key_risk_categories": ["business", "financial", "regulatory", "macro", "liquidity"]}'
            ),
            agent=risk_agent,
            async_execution=False,
        )
        portfolio_task = Task(
            description=(
                f"{context}\n\n"
                f"PORTFOLIO FIT TASK for {snapshot.symbol} ({snapshot.company_name}):\n"
                f"Client Profile: Risk Tolerance = {risk_tolerance}, "
                f"Investment Horizon = {horizon}, "
                f"Portfolio Context = '{portfolio_context or 'Not provided'}'.\n"
                f"You have access to all specialist findings: the risk_score from the Risk Agent, "
                f"the recommendation from the Fundamental Agent, the signal from the Technical Agent, "
                f"and the sentiment composite from the Sentiment Agent.\n\n"
                f"MANDATORY DECISION STEPS:\n"
                f"Step 1 (Risk Profile Match): Map the risk_score from the Risk Agent to the client's "
                f"risk_tolerance of '{risk_tolerance}'. Is the asset's risk level BELOW, AT, or ABOVE "
                f"the client's stated tolerance? This is the primary gating decision.\n"
                f"Step 2 (Horizon Alignment): Is the investment thesis (from Fundamental Agent) "
                f"achievable within the client's '{horizon}' horizon? Fundamental turnarounds take "
                f"2-4 years, technical setups can play out in weeks to months.\n"
                f"Step 3 (Position Sizing): Using the fixed-fractional method, calculate the "
                f"suggested allocation % range: Low-risk stock → 5-10%, Medium-risk → 3-7%, "
                f"High-risk → 1-3%. Adjust DOWN if the portfolio_context suggests existing "
                f"concentration in the same sector.\n"
                f"Step 4 (Concentration Check): Does adding {snapshot.symbol} to the client's "
                f"existing portfolio (described in portfolio_context) create excessive sector or "
                f"geographic concentration? Flag if post-addition sector exposure > 40%.\n"
                f"Step 5 (Entry Strategy): Based on the technical agent's signal and the fundamental "
                f"agent's recommendation, advise on HOW to enter: full position now, staged entry "
                f"over 3 tranches, starter position with add-on confirmation, or avoid entirely.\n"
                f"Step 6 (Rebalancing Trigger): Define the specific event or price level that should "
                f"prompt the client to reassess or exit this position.\n\n"
                f"Return ONLY valid raw JSON — no markdown wrappers."
            ),
            expected_output=(
                'A single valid JSON object: {"fit_score": 0-100, '
                '"allocation_advice": "specific advice with percentage range", '
                '"entry_strategy": "full_position|staged_3_tranches|starter_position|avoid", '
                '"suggested_allocation_pct_range": "X%-Y%", '
                '"horizon_alignment": "well_aligned|partially_aligned|misaligned", '
                '"concentration_warning": true|false, '
                '"concentration_note": "explanation or null", '
                '"rebalancing_trigger": "specific trigger condition", '
                '"rationale": ["reason1", "reason2", "reason3"]}'
            ),
            agent=portfolio_agent,
            async_execution=False,
        )
        master_task = Task(
            description=(
                f"{context}\n\n"
                f"INVESTMENT COMMITTEE FINAL VERDICT for {snapshot.symbol} ({snapshot.company_name}):\n"
                f"As Investment Committee Chair, you have just received five specialist reports: "
                f"News, Fundamental, Technical, Sentiment, and Risk. Your job is to chair a "
                f"virtual investment committee meeting and produce the final, binding verdict.\n\n"
                f"DELIBERATION PROCESS — follow this exact sequence:\n\n"
                f"PHASE 1 — IDENTIFY AGREEMENTS: What do the majority of agents agree on? "
                f"If Fundamental says 'buy', Technical says 'buy', and Sentiment is 'bullish', "
                f"the committee has a strong bull consensus. List the areas of agreement.\n\n"
                f"PHASE 2 — IDENTIFY CONFLICTS: Where do agents disagree? "
                f"E.g., Fundamental says 'buy' (undervalued) but Technical says 'wait' "
                f"(downtrend, no reversal signal yet). Conflicts require explanation — WHY does "
                f"the conflict exist and which agent's view should be given more weight? "
                f"In general: Fundamental > Technical > Sentiment for long-term investments. "
                f"Technical > Fundamental > Sentiment for short-term trades.\n\n"
                f"PHASE 3 — RISK GATE: The Risk Agent's finding is a HARD GATE. If risk_score > 80, "
                f"the committee CANNOT issue a 'Buy' recommendation regardless of what other agents say. "
                f"Maximum you can issue is 'Hold' with strict position sizing caveats.\n\n"
                f"PHASE 4 — FINAL VERDICT: After deliberation, issue your decisive committee verdict:\n"
                f"  - 'Buy': Fundamental upside + Technical confirmation + Risk manageable (score < 70)"
                f" + Sentiment not extreme-bearish\n"
                f"  - 'Hold': Mixed signals, or thesis valid but entry timing poor, or risk elevated\n"
                f"  - 'Sell': Fundamental deterioration OR technical breakdown + elevated risk score\n\n"
                f"PHASE 5 - INVESTMENT THESIS (6 concise points, 20-35 words each):\n"
                f"Use one clear claim, a supplied metric or specialist finding, and its investor implication. Do not repeat the same evidence across points.\n\n"
                f"  Point 1 - Fundamental Value: use available valuation data and the key catalyst.\n"
                f"  Point 2 - Growth Catalyst: give the best-supported growth driver and timeframe.\n"
                f"  Point 3 - Technical Setup: state the strongest supplied trend or level signal.\n"
                f"  Point 4 - Competitive Position: summarize the moat evidence or state that it is unavailable.\n"
                f"  Point 5 - Risk vs Reward: connect the key risk to the user's risk profile.\n"
                f"  Point 6 - Macro Context: include only a relevant, supplied macro factor.\n\n"
                f"PHASE 6 - NEXT ACTION ITEMS (5 specific, time-bound investor instructions ranked strictly by importance):\n"
                f"Rank all actions in order of importance / urgency (the most important action MUST come first, then second, and so on).\n"
                f"Each action MUST be a concise sentence with a clear verb and a supplied price, trigger, or event when available. Never invent dates or metrics.\n"
                f"Generic actions like 'Monitor the stock' are not acceptable. Be precise enough that the investor can act immediately.\n\n"
                f"Good example: 'Set a GTC limit buy at Rs 1840 (200-DMA support), to be reviewed on Q2FY25 earnings day (expected late October),"
                f"because this level has held as demand zone three times in 18 months and a bounce here confirms the bull thesis.'\n\n"
                f"  Action 1 (Most Critical) - Immediate Trigger (Entry level or capital preservation action)\n"
                f"  Action 2 (High Priority) - Risk Protocol (Stop-loss level or sizing limit to protect capital)\n"
                f"  Action 3 (Medium Priority) - Execution Milestone (Profit target or tranche deployment)\n"
                f"  Action 4 (Tactical Watch) - Earnings or Catalyst Date (Event name + date + key metric)\n"
                f"  Action 5 (Contingency) - Thesis Invalidation Rule (Condition that forces an immediate full exit)\n\n"
                f"Executive summary: 4-5 sentences covering fundamental picture, technical setup, key risk, and final verdict with conviction level (HIGH/MEDIUM/LOW).\n\n"
                f"Return ONLY valid raw JSON - no markdown wrappers. The JSON must exactly match:\n"
                f'{{"recommendation": "Buy|Hold|Sell", "target_bias": "Bull case: Rs X (+Y%), Base case: Rs X, Bear case: Rs X (-Y%)", '
                f'"summary": "4-5 sentence executive summary with conviction level HIGH/MEDIUM/LOW", '
                f'"thesis": ["concise point 1", "concise point 2", "concise point 3", "concise point 4", "concise point 5", "concise point 6"], '
                f'"action_items": ["specific action 1 with price+date", "specific action 2", "specific action 3", "specific action 4", "specific action 5"]}}'
            ),
            expected_output=(
                "A raw, parsable JSON object with keys: recommendation (Buy|Hold|Sell), "
                "target_bias (bull/base/bear case price targets with specific % moves), "
                "summary (3-4 sentence executive summary with specific metrics and conviction level HIGH/MEDIUM/LOW), "
                "thesis (list of 6 concise investment points grounded in supplied evidence), "
                "action_items (list of 5 specific time-bound actions, each minimum 25 words, each with a price level or trigger condition)."
            ),
        )

        tasks = [news_task, fundamental_task, technical_task, sentiment_task, risk_task, portfolio_task, master_task]

        # -----------------------------------------------------------------
        # Crew with hierarchical process and production configuration
        # -----------------------------------------------------------------
        crew = Crew(
            agents=[
                news_agent,
                fundamental_agent,
                technical_agent,
                sentiment_agent,
                risk_agent,
                portfolio_agent,
            ],
            tasks=tasks,
            process=Process.hierarchical,
            manager_agent=master_agent,
            memory=False,
            verbose=False,
            output_log_file="crew_execution.log",
        )

        logger.info("Kicking off CrewAI crew for %s", snapshot.symbol)
        try:
            result = crew.kickoff()
        except Exception as exc:
            logger.error("CrewAI crew execution failed: %s: %s", type(exc).__name__, exc)
            raise CrewAIUnavailableError(
                f"CrewAI crew execution failed: {type(exc).__name__}: {exc}"
            ) from exc

        logger.info("CrewAI crew completed for %s", snapshot.symbol)

        specialist_findings = {}

        def try_parse_json(raw: str) -> dict | None:
            if not raw:
                return None
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.strip("`")
                cleaned = cleaned.removeprefix("json").strip()
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start >= 0 and end > start:
                cleaned = cleaned[start : end + 1]
            try:
                return json.loads(cleaned)
            except Exception:
                return None

        # Capture task outputs
        specialist_findings["news"] = try_parse_json(news_task.output.raw if hasattr(news_task, 'output') and news_task.output else "")
        specialist_findings["fundamental"] = try_parse_json(fundamental_task.output.raw if hasattr(fundamental_task, 'output') and fundamental_task.output else "")
        specialist_findings["technical"] = try_parse_json(technical_task.output.raw if hasattr(technical_task, 'output') and technical_task.output else "")
        specialist_findings["sentiment"] = try_parse_json(sentiment_task.output.raw if hasattr(sentiment_task, 'output') and sentiment_task.output else "")
        specialist_findings["risk"] = try_parse_json(risk_task.output.raw if hasattr(risk_task, 'output') and risk_task.output else "")
        specialist_findings["portfolio"] = try_parse_json(portfolio_task.output.raw if hasattr(portfolio_task, 'output') and portfolio_task.output else "")

        master_parsed = _parse_crewai_json(str(result))
        master_parsed["specialist_findings"] = {k: v for k, v in specialist_findings.items() if v is not None}
        return master_parsed


def _evidence_payload(
    snapshot: MarketSnapshot,
    specialist_findings: list[AgentFinding],
    news_items: list[NewsItem],
    risk_tolerance: str,
    horizon: str,
    portfolio_context: str | None,
) -> dict[str, Any]:
    return {
        "symbol": snapshot.symbol,
        "company_name": snapshot.company_name,
        "market_snapshot": {
            "price": snapshot.price,
            "previous_close": snapshot.previous_close,
            "market_cap": snapshot.market_cap,
            "pe_ratio": snapshot.pe_ratio,
            "revenue_growth": snapshot.revenue_growth,
            "profit_margin": snapshot.profit_margin,
            "debt_to_equity": snapshot.debt_to_equity,
            "beta": snapshot.beta,
        },
        "specialist_findings": [finding.model_dump() for finding in specialist_findings],
        "news": [item.model_dump() for item in news_items],
        "user_profile": {
            "risk_tolerance": risk_tolerance,
            "horizon": horizon,
            "portfolio_context": portfolio_context,
        },
    }


def _parse_crewai_json(raw: str) -> dict[str, Any]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.removeprefix("json").strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        cleaned = cleaned[start : end + 1]

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("CrewAI returned non-JSON output: %s", raw[:500])
        raise CrewAIUnavailableError("CrewAI returned non-JSON output.") from exc

    recommendation = parsed.get("recommendation")
    if recommendation not in {"Buy", "Hold", "Sell"}:
        parsed["recommendation"] = "Hold"
    parsed["target_bias"] = str(parsed.get("target_bias") or "Balanced risk/reward")
    parsed["summary"] = str(parsed.get("summary") or "CrewAI completed the investment committee review.")
    parsed["thesis"] = _string_list(parsed.get("thesis"))
    parsed["action_items"] = _string_list(parsed.get("action_items"))
    return parsed


def _string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()][:6]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []




