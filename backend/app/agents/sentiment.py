from app.models.analysis import AgentFinding, NewsItem


class SentimentAnalysisAgent:
    name = "Sentiment Analysis Agent"

    async def run(self, symbol: str, news: list[NewsItem]) -> AgentFinding:
        text = " ".join(f"{item.title} {item.summary or ''}" for item in news).lower()
        bullish = ["buy", "bull", "surge", "optimistic", "outperform", "demand", "ai", "record"]
        bearish = ["sell", "bear", "slump", "concern", "underperform", "weak", "delay", "risk"]
        bullish_count = sum(text.count(word) for word in bullish)
        bearish_count = sum(text.count(word) for word in bearish)
        raw = bullish_count - bearish_count
        score = max(0, min(100, 50 + raw * 7))
        mood = "bullish" if score >= 61 else "bearish" if score <= 39 else "neutral"

        return AgentFinding(
            agent=self.name,
            summary=f"Market sentiment for {symbol} screens as {mood}.",
            confidence=0.55,
            signals=[
                f"Bullish keyword hits: {bullish_count}",
                f"Bearish keyword hits: {bearish_count}",
                "Social channels can be connected later for Reddit/X-specific scoring.",
            ],
            data={"score": score, "bullish_hits": bullish_count, "bearish_hits": bearish_count},
        )
