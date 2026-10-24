from __future__ import annotations

from datetime import datetime
import time
from typing import Any
from urllib.parse import quote_plus, urlparse

import httpx

from app.core.config import get_settings
from app.models.analysis import NewsItem

# Trusted financial news domains — only FREE, no-paywall sites
TRUSTED_DOMAINS = [
    # Indian financial news (free)
    "economictimes.indiatimes.com",
    "moneycontrol.com",
    "financialexpress.com",
    "ndtvprofit.com",
    "ndtv.com",
    "zeebiz.com",
    "businesstoday.in",
    "cnbctv18.com",
    "indiainfoline.com",
    "livemint.com",
    "business-standard.com",
    # Global financial news (free)
    "reuters.com",
    "cnbc.com",
    "investopedia.com",
    "fool.com",
    "finance.yahoo.com",
    "yahoo.com",
    "apnews.com",
    "bbc.com",
]

# Domains that are blocked — paywalled or redirect to search pages
BLOCKED_DOMAINS = [
    "tradingview.com",
    "news.google.com",
    "google.com",
    "twitter.com",
    "x.com",
    # Paywalled sites
    "bloomberg.com",
    "wsj.com",
    "ft.com",
    "barrons.com",
    "seekingalpha.com",
    "thehindu.com",
    "thehindubusinessline.com",
    "forbes.com",
    "marketwatch.com",
]

# Source display names for trusted domains
SOURCE_DISPLAY_NAMES: dict[str, str] = {
    "economictimes.indiatimes.com": "Economic Times",
    "moneycontrol.com": "Moneycontrol",
    "financialexpress.com": "Financial Express",
    "ndtvprofit.com": "NDTV Profit",
    "ndtv.com": "NDTV",
    "zeebiz.com": "Zee Business",
    "businesstoday.in": "Business Today",
    "cnbctv18.com": "CNBC TV18",
    "indiainfoline.com": "IIFL",
    "livemint.com": "Mint",
    "business-standard.com": "Business Standard",
    "reuters.com": "Reuters",
    "cnbc.com": "CNBC",
    "investopedia.com": "Investopedia",
    "fool.com": "Motley Fool",
    "finance.yahoo.com": "Yahoo Finance",
    "yahoo.com": "Yahoo Finance",
    "apnews.com": "AP News",
    "bbc.com": "BBC",
}



def _is_valid_url(url: str | None) -> bool:
    """Return True if the URL is a direct article link from a non-blocked domain."""
    if not url:
        return False
    try:
        parsed = urlparse(url)
        hostname = parsed.netloc.lower().replace("www.", "")
        # Block known bad domains
        for blocked in BLOCKED_DOMAINS:
            if hostname == blocked or hostname.endswith("." + blocked):
                return False
        return True
    except Exception:
        return False


def _get_source_name(url: str | None) -> str:
    """Derive a clean source display name from the article URL."""
    if not url:
        return "News"
    try:
        hostname = urlparse(url).netloc.lower().replace("www.", "")
        for domain, name in SOURCE_DISPLAY_NAMES.items():
            if hostname == domain or hostname.endswith("." + domain):
                return name
        # Fallback: capitalise the hostname root
        parts = hostname.split(".")
        return parts[-2].capitalize() if len(parts) >= 2 else hostname.capitalize()
    except Exception:
        return "News"


class NewsDataService:
    """Collects recent finance headlines from Tavily when configured, otherwise Yahoo RSS."""

    def __init__(self, cache_ttl_seconds: int = 180) -> None:
        self._cache_ttl_seconds = cache_ttl_seconds
        self._news_cache: dict[tuple[str, str], tuple[float, list[NewsItem]]] = {}

    async def search_company_news(self, symbol: str, company_name: str) -> list[NewsItem]:
        key = (symbol.upper().strip(), company_name.casefold().strip())
        cached = self._news_cache.get(key)
        now = time.monotonic()
        if cached and now - cached[0] < self._cache_ttl_seconds:
            return list(cached[1])

        settings = get_settings()
        if settings.tavily_api_key:
            tavily_results = await self._search_tavily(symbol, company_name, settings.tavily_api_key)
            if tavily_results:
                results = tavily_results
            else:
                results = await self._search_yahoo_rss(symbol)
        else:
            results = await self._search_yahoo_rss(symbol)

        self._news_cache[key] = (time.monotonic(), list(results))
        if len(self._news_cache) > 500:
            oldest = sorted(self._news_cache.items(), key=lambda item: item[1][0])[:100]
            for old_key, _ in oldest:
                self._news_cache.pop(old_key, None)
        return list(results)

    async def _search_tavily(self, symbol: str, company_name: str, api_key: str) -> list[NewsItem]:
        import asyncio

        # Determine whether this is an Indian or global stock
        is_indian = symbol.endswith(".NS") or symbol.endswith(".BO")

        # Use trusted Indian + global sources as include_domains
        include_domains = TRUSTED_DOMAINS if is_indian else [
            d for d in TRUSTED_DOMAINS if d not in (
                "business-standard.com", "livemint.com", "moneycontrol.com",
                "financialexpress.com", "ndtvprofit.com", "ndtv.com",
                "thehindu.com", "thehindubusinessline.com",
            )
        ]

        ticker = symbol.split(".")[0]

        # Two separate Tavily calls in parallel:
        # Call A — 4 pure breaking news articles
        payload_news = {
            "api_key": api_key,
            "query": f"{company_name} latest news",
            "search_depth": "basic",
            "topic": "news",
            "max_results": 8,
            "include_domains": include_domains,
        }
        # Call B — 2 stock analysis / market data articles
        payload_general = {
            "api_key": api_key,
            "query": f"{ticker} {company_name} stock analysis outlook target price",
            "search_depth": "basic",
            "topic": "general",
            "max_results": 5,
            "include_domains": include_domains,
        }

        async def _fetch(payload: dict) -> list[dict]:
            try:
                async with httpx.AsyncClient(timeout=12) as client:
                    resp = await client.post("https://api.tavily.com/search", json=payload)
                    resp.raise_for_status()
                    return resp.json().get("results", [])
            except Exception:
                return []

        news_raw, general_raw = await asyncio.gather(
            _fetch(payload_news),
            _fetch(payload_general),
        )

        def _parse(raw_items: list[dict], limit: int) -> list[NewsItem]:
            items: list[NewsItem] = []
            seen_urls: set[str] = set()
            for item in raw_items:
                url = item.get("url")
                if not _is_valid_url(url) or url in seen_urls:
                    continue
                seen_urls.add(url)
                items.append(
                    NewsItem(
                        title=str(item.get("title") or "Untitled"),
                        source=_get_source_name(url),
                        url=url,
                        published_at=item.get("published_date"),
                        summary=item.get("content"),
                    )
                )
                if len(items) >= limit:
                    break
            return items

        news_items = _parse(news_raw, 2)        # 2 pure news
        general_items = _parse(general_raw, 2)  # 2 analysis/data articles

        # Deduplicate between the two lists before merging
        news_urls = {i.url for i in news_items}
        general_items = [i for i in general_items if i.url not in news_urls]

        return news_items + general_items


    async def _search_yahoo_rss(self, symbol: str) -> list[NewsItem]:
        # Try yfinance built-in news first (returns direct article URLs, not Google News redirects)
        try:
            import yfinance as yf
            import asyncio

            def _fetch_yf_news():
                ticker = yf.Ticker(symbol)
                return ticker.news or []

            raw_news = await asyncio.to_thread(_fetch_yf_news)
            items = []
            for article in raw_news[:10]:
                content = article.get("content") or article
                url = (
                    content.get("canonicalUrl", {}).get("url")
                    or content.get("clickThroughUrl", {}).get("url")
                    or content.get("url")
                    or article.get("link")
                    or article.get("url")
                )
                title = content.get("title") or article.get("title") or "Untitled"
                summary = content.get("summary") or content.get("description") or article.get("summary") or ""
                pub = content.get("pubDate") or content.get("displayTime") or str(article.get("providerPublishTime") or "")

                if not _is_valid_url(url):
                    continue

                items.append(
                    NewsItem(
                        title=str(title),
                        source=_get_source_name(url),
                        url=url,
                        published_at=str(pub),
                        summary=str(summary),
                    )
                )
                if len(items) >= 5:
                    break

            if items:
                return items
        except Exception:
            pass

        # Final fallback: Yahoo Finance RSS
        region = "IN" if symbol.endswith(".NS") or symbol.endswith(".BO") else "US"
        lang = "en-IN" if region == "IN" else "en-US"
        rss_url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={quote_plus(symbol)}&region={region}&lang={lang}"
        try:
            import xml.etree.ElementTree as ET

            async with httpx.AsyncClient(timeout=8) as client:
                response = await client.get(rss_url)
                response.raise_for_status()
            root = ET.fromstring(response.text)
            items = []
            for item in root.findall(".//item")[:10]:
                article_url = item.findtext("link") or item.findtext("guid")
                if not _is_valid_url(article_url):
                    continue
                items.append(
                    NewsItem(
                        title=item.findtext("title") or "Untitled",
                        source=_get_source_name(article_url),
                        url=article_url,
                        published_at=item.findtext("pubDate"),
                        summary=item.findtext("description"),
                    )
                )
                if len(items) >= 5:
                    break
            if items:
                return items
        except Exception:
            pass

        today = datetime.utcnow().date().isoformat()
        return [
            NewsItem(
                title=f"{symbol} market coverage unavailable in offline mode",
                source="Local fallback",
                published_at=today,
                summary="Connect Tavily or allow Yahoo Finance RSS access for live headlines.",
            )
        ]

