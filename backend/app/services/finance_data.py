from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from random import Random
from typing import Any


@dataclass
class MarketSnapshot:
    symbol: str
    company_name: str
    price: float
    previous_close: float
    market_cap: float | None
    pe_ratio: float | None
    revenue_growth: float | None
    profit_margin: float | None
    debt_to_equity: float | None
    beta: float | None
    currency: str
    history: list[dict[str, float | str]]


class FinanceDataService:
    """Fetches market data, using yfinance when available and deterministic fallback data otherwise."""

    async def get_snapshot(self, symbol: str) -> MarketSnapshot:
        symbol = symbol.upper().strip()
        try:
            import yfinance as yf  # type: ignore

            ticker = yf.Ticker(symbol)
            info: dict[str, Any] = ticker.info or {}
            history_frame = ticker.history(period="6mo", interval="1d")
            history = [
                {
                    "date": str(index.date()),
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": float(row["Volume"]),
                }
                for index, row in history_frame.tail(120).iterrows()
            ]
            price = None
            if "currentPrice" in info and info["currentPrice"] is not None:
                price = float(info["currentPrice"])
            elif "regularMarketPrice" in info and info["regularMarketPrice"] is not None:
                price = float(info["regularMarketPrice"])
            elif history:
                price = float(history[-1]["close"])
            else:
                price = 0.0

            previous_close = None
            if "previousClose" in info and info["previousClose"] is not None:
                previous_close = float(info["previousClose"])
            elif len(history) >= 2:
                previous_close = float(history[-2]["close"])
            elif history:
                previous_close = float(history[-1]["close"])
            else:
                previous_close = price

            return MarketSnapshot(
                symbol=symbol,
                company_name=str(info.get("longName") or info.get("shortName") or symbol),
                price=price,
                previous_close=previous_close,
                market_cap=_to_float(info.get("marketCap")),
                pe_ratio=_to_float(info.get("trailingPE")),
                revenue_growth=_to_float(info.get("revenueGrowth")),
                profit_margin=_to_float(info.get("profitMargins")),
                debt_to_equity=_to_float(info.get("debtToEquity")),
                beta=_to_float(info.get("beta")),
                currency=str(info.get("currency") or "USD"),
                history=history,
            )
        except Exception:
            return self._fallback_snapshot(symbol)

    def _fallback_snapshot(self, symbol: str) -> MarketSnapshot:
        seed = sum(ord(char) for char in symbol)
        rng = Random(seed)
        base = 60 + (seed % 190)
        trend = rng.uniform(-0.12, 0.18)
        volatility = rng.uniform(0.012, 0.04)
        history: list[dict[str, float | str]] = []
        current = float(base)
        start = datetime.utcnow() - timedelta(days=150)

        for day in range(120):
            seasonal = math.sin(day / 8) * volatility * current
            drift = current * trend / 120
            shock = rng.uniform(-volatility, volatility) * current
            close = max(5.0, current + drift + seasonal + shock)
            high = close * (1 + rng.uniform(0.002, 0.018))
            low = close * (1 - rng.uniform(0.002, 0.018))
            open_price = (current + close) / 2
            volume = rng.randint(2_000_000, 70_000_000)
            history.append(
                {
                    "date": (start + timedelta(days=day)).date().isoformat(),
                    "open": round(open_price, 2),
                    "high": round(high, 2),
                    "low": round(low, 2),
                    "close": round(close, 2),
                    "volume": float(volume),
                }
            )
            current = close

        previous_close = float(history[-2]["close"])
        price = float(history[-1]["close"])
        return MarketSnapshot(
            symbol=symbol,
            company_name=f"{symbol} Inc.",
            price=round(price, 2),
            previous_close=round(previous_close, 2),
            market_cap=float((seed % 900 + 40) * 1_000_000_000),
            pe_ratio=round(rng.uniform(12, 52), 2),
            revenue_growth=round(rng.uniform(-0.08, 0.28), 3),
            profit_margin=round(rng.uniform(0.04, 0.34), 3),
            debt_to_equity=round(rng.uniform(8, 180), 2),
            beta=round(rng.uniform(0.75, 1.95), 2),
            currency="INR" if symbol.endswith((".NS", ".BO")) else "USD",
            history=history,
        )


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        if math.isnan(float(value)):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None
