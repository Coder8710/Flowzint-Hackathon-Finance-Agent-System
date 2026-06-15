from __future__ import annotations

from datetime import datetime
from typing import Any
from urllib.parse import quote_plus

import httpx

from app.core.config import get_settings
from app.models.analysis import NewsItem


class NewsDataService:
    """Collects recent finance headlines from Tavily when configured, otherwise Yahoo RSS."""

    async def search_company_news(self, symbol: str, company_name: str) -> list[NewsItem]:
        settings = get_settings()
        if settings.tavily_api_key:
            tavily_results = await self._search_tavily(symbol, company_name, settings.tavily_api_key)
            if tavily_results:
                return tavily_results
        return await self._search_yahoo_rss(symbol)

    async def _search_tavily(self, symbol: str, company_name: str, api_key: str) -> list[NewsItem]:
        payload = {
            "api_key": api_key,
            "query": f"{company_name} {symbol} stock latest financial news",
            "search_depth": "basic",
            "topic": "news",
            "max_results": 5,
        }
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                response = await client.post("https://api.tavily.com/search", json=payload)
                response.raise_for_status()
                data: dict[str, Any] = response.json()
            return [
                NewsItem(
                    title=str(item.get("title") or "Untitled"),
                    source="Tavily",
                    url=item.get("url"),
                    published_at=item.get("published_date"),
                    summary=item.get("content"),
                )
                for item in data.get("results", [])[:5]
            ]
        except Exception:
            return []

    async def _search_yahoo_rss(self, symbol: str) -> list[NewsItem]:
        url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={quote_plus(symbol)}&region=US&lang=en-US"
        try:
            import xml.etree.ElementTree as ET

            async with httpx.AsyncClient(timeout=8) as client:
                response = await client.get(url)
                response.raise_for_status()
            root = ET.fromstring(response.text)
            items = []
            for item in root.findall(".//item")[:5]:
                items.append(
                    NewsItem(
                        title=item.findtext("title") or "Untitled",
                        source="Yahoo Finance",
                        url=item.findtext("link"),
                        published_at=item.findtext("pubDate"),
                        summary=item.findtext("description"),
                    )
                )
            return items
        except Exception:
            today = datetime.utcnow().date().isoformat()
            return [
                NewsItem(
                    title=f"{symbol} market coverage unavailable in offline mode",
                    source="Local fallback",
                    published_at=today,
                    summary="Connect Tavily or allow Yahoo Finance RSS access for live headlines.",
                )
            ]
