import asyncio
import threading
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app.models.analysis import NewsItem
from app.services.finance_data import FinanceDataService
from app.services.news_data import NewsDataService


class DataCacheTests(unittest.IsolatedAsyncioTestCase):
    async def test_market_snapshot_is_cached_and_loaded_off_event_loop(self):
        service = FinanceDataService(cache_ttl_seconds=30)
        main_thread = threading.get_ident()
        fetch_threads = []
        fetch_count = 0

        def load(symbol):
            nonlocal fetch_count
            fetch_count += 1
            fetch_threads.append(threading.get_ident())
            return service._fallback_snapshot(symbol)

        service._load_snapshot = load
        first = await service.get_snapshot("test")
        second = await service.get_snapshot("TEST")

        self.assertIs(first, second)
        self.assertEqual(fetch_count, 1)
        self.assertNotEqual(fetch_threads[0], main_thread)

    async def test_news_results_are_cached(self):
        service = NewsDataService(cache_ttl_seconds=30)
        news = [NewsItem(title="Example results", source="Example")]
        calls = 0

        async def fetch(_symbol):
            nonlocal calls
            calls += 1
            return news

        service._search_yahoo_rss = fetch
        settings = SimpleNamespace(tavily_api_key=None)
        with patch("app.services.news_data.get_settings", return_value=settings):
            first = await service.search_company_news("AAPL", "Apple")
            second = await service.search_company_news("aapl", "APPLE")

        self.assertEqual(first, second)
        self.assertEqual(calls, 1)


if __name__ == "__main__":
    unittest.main()
