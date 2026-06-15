# Flowzint Finance Agent System — tasks.py — Production Ready

"""
Standalone CrewAI task definitions for the Flowzint Finance Agent System.

Each task:
  - Uses {ticker} as a dynamic variable in its description
  - Specifies expected_output matching the exact JSON schema for its agent
  - Uses async_execution=False for deterministic sequential execution
  - Implements context chaining:
      * fundamental_task and technical_task receive context=[news_task]
      * sentiment_task receives context=[news_task, fundamental_task, technical_task]

This module can be used independently of finance_crew.py for headless
crew runs via crew.py's run_analysis() function.
"""

from __future__ import annotations

import logging

from crewai import Agent, Task

logger = logging.getLogger(__name__)


def create_news_task(agent: Agent, ticker: str) -> Task:
    """Create the news analysis task for the given ticker."""
    logger.info("Creating news analysis task for ticker=%s", ticker)
    return Task(
        description=(
            f"Analyze all real-time breaking news, corporate announcements, and macro-economic "
            f"developments that could act as immediate or short-term price catalysts for {ticker}.\n\n"
            f"Step 1: Search the web for the latest news on {ticker} from the past 48 hours.\n"
            f"Step 2: Cross-reference findings against authoritative sources (Reuters, Bloomberg, "
            f"SEC EDGAR, Federal Reserve).\n"
            f"Step 3: Filter out clickbait, unverified rumors, and unsubstantiated social media posts.\n"
            f"Step 4: Classify the most impactful catalyst and assess its directional impact.\n"
            f"Step 5: Return your analysis as a single valid JSON object.\n\n"
            f"Ticker to analyze: {ticker}"
        ),
        expected_output=(
            "A single valid JSON object (no markdown wrappers) with exactly this schema:\n"
            "{\n"
            '  "headline_summary": "concise summary of the most impactful headline",\n'
            '  "catalyst_type": "earnings|macro|regulatory|geopolitical|M&A",\n'
            '  "impact_direction": "bullish|bearish|neutral",\n'
            '  "confidence_score": 0-100,\n'
            '  "sources": ["url1", "url2"]\n'
            "}"
        ),
        agent=agent,
        async_execution=False,
    )


def create_fundamental_task(agent: Agent, ticker: str, news_task: Task) -> Task:
    """Create the fundamental analysis task with news context."""
    logger.info("Creating fundamental analysis task for ticker=%s", ticker)
    return Task(
        description=(
            f"Perform a deep-dive fundamental analysis on {ticker} covering valuation multiples, "
            f"margin trajectories, debt levels, and overall business quality.\n\n"
            f"Step 1: Search for {ticker}'s latest 10-K, 10-Q, and earnings transcripts.\n"
            f"Step 2: Calculate or retrieve key metrics: P/E ratio, EV/EBITDA, FCF yield, ROIC, "
            f"and debt-to-equity.\n"
            f"Step 3: Run a DCF valuation model using available data and comparable company analysis.\n"
            f"Step 4: Assess the company's economic moat (wide, narrow, or none).\n"
            f"Step 5: Determine intrinsic value and compare to current market price.\n"
            f"Step 6: If any metric is unavailable, mark it as null and explain why.\n"
            f"Step 7: Return your analysis as a single valid JSON object.\n\n"
            f"Use the News Agent's findings (provided as context) to factor in any news-driven "
            f"impacts on fundamental valuation.\n\n"
            f"Ticker to analyze: {ticker}"
        ),
        expected_output=(
            "A single valid JSON object (no markdown wrappers) with exactly this schema:\n"
            "{\n"
            '  "intrinsic_value_estimate": "$X",\n'
            '  "current_price_premium_discount_pct": "X%",\n'
            '  "key_metrics": {\n'
            '    "pe_ratio": X,\n'
            '    "ev_ebitda": X,\n'
            '    "fcf_yield_pct": X,\n'
            '    "roic_pct": X,\n'
            '    "debt_to_equity": X\n'
            "  },\n"
            '  "moat_rating": "wide|narrow|none",\n'
            '  "recommendation": "buy|hold|sell|avoid"\n'
            "}"
        ),
        agent=agent,
        async_execution=False,
        context=[news_task],
    )


def create_technical_task(agent: Agent, ticker: str, news_task: Task) -> Task:
    """Create the technical analysis task with news context."""
    logger.info("Creating technical analysis task for ticker=%s", ticker)
    return Task(
        description=(
            f"Perform a comprehensive technical analysis on {ticker} to identify optimal entry "
            f"and exit points.\n\n"
            f"Step 1: Search the web for {ticker}'s recent OHLCV data and current indicator readings.\n"
            f"Step 2: Analyze price action across daily and weekly timeframes.\n"
            f"Step 3: Calculate or retrieve RSI (14-period), MACD (12/26/9), and volume profile.\n"
            f"Step 4: Identify key support and resistance levels using Dow Theory and Wyckoff method.\n"
            f"Step 5: Determine trend direction and whether volume confirms the move.\n"
            f"Step 6: Define a specific entry zone, stop loss, and target price.\n"
            f"Step 7: If no clear setup exists, output 'wait' as the signal — never force a trade.\n"
            f"Step 8: Return your analysis as a single valid JSON object.\n\n"
            f"Use the News Agent's findings (provided as context) to factor in any news-driven "
            f"catalysts that may affect short-term price action.\n\n"
            f"Ticker to analyze: {ticker}"
        ),
        expected_output=(
            "A single valid JSON object (no markdown wrappers) with exactly this schema:\n"
            "{\n"
            '  "trend_direction": "uptrend|downtrend|sideways",\n'
            '  "rsi_reading": X,\n'
            '  "macd_signal": "bullish_cross|bearish_cross|neutral",\n'
            '  "volume_confirmation": true|false,\n'
            '  "key_support": "$X",\n'
            '  "key_resistance": "$X",\n'
            '  "entry_zone": "$X-$Y",\n'
            '  "stop_loss": "$X",\n'
            '  "target_price": "$X",\n'
            '  "signal": "buy|sell|wait"\n'
            "}"
        ),
        agent=agent,
        async_execution=False,
        context=[news_task],
    )


def create_sentiment_task(
    agent: Agent,
    ticker: str,
    news_task: Task,
    fundamental_task: Task,
    technical_task: Task,
) -> Task:
    """Create the sentiment analysis task with full context chain."""
    logger.info("Creating sentiment analysis task for ticker=%s", ticker)
    return Task(
        description=(
            f"Measure fear, greed, and crowd positioning for {ticker} by analyzing social media "
            f"tone, options flow proxies, and retail vs. institutional behavior.\n\n"
            f"Step 1: Search for {ticker} sentiment on Reddit (r/wallstreetbets, r/stocks), "
            f"StockTwits, and financial Twitter/X.\n"
            f"Step 2: Check Google Trends search volume for {ticker} and related terms.\n"
            f"Step 3: Look up put/call ratio and short interest data if available.\n"
            f"Step 4: Assess whether the crowd is overly euphoric or deeply pessimistic.\n"
            f"Step 5: Determine if a contrarian signal exists (sentiment extremes > +80 or < -80).\n"
            f"Step 6: Cross-reference your sentiment findings against the News, Fundamental, and "
            f"Technical analyses provided as context.\n"
            f"Step 7: Flag sentiment as a confirming or conflicting secondary signal.\n"
            f"Step 8: Return your analysis as a single valid JSON object.\n\n"
            f"Ticker to analyze: {ticker}"
        ),
        expected_output=(
            "A single valid JSON object (no markdown wrappers) with exactly this schema:\n"
            "{\n"
            '  "sentiment_score": -100 to 100,\n'
            '  "fear_greed_proxy": "extreme_fear|fear|neutral|greed|extreme_greed",\n'
            '  "social_buzz_volume": "low|medium|high",\n'
            '  "positioning_bias": "retail_long|institutional_short|balanced|mixed",\n'
            '  "contrarian_signal": true|false,\n'
            '  "contrarian_rationale": "explanation of why contrarian signal is or is not present"\n'
            "}"
        ),
        agent=agent,
        async_execution=False,
        context=[news_task, fundamental_task, technical_task],
    )
