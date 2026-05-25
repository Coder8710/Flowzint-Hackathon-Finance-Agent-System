from app.models.analysis import AgentFinding, NewsItem


class NewsAgent:
    name = "News Agent"

    async def run(self, news: list[NewsItem]) -> AgentFinding:
        if not news:
            return AgentFinding(
                agent=self.name,
                summary="No recent headlines were available.",
                confidence=0.3,
                signals=["Add Tavily API credentials for broader real-time coverage."],
                data={"score": 50},
            )

        joined = " ".join(f"{item.title} {item.summary or ''}" for item in news).lower()
        positive_hits = sum(word in joined for word in ["beats", "growth", "upgrade", "surge", "profit", "record"])
        negative_hits = sum(word in joined for word in ["miss", "lawsuit", "downgrade", "falls", "loss", "probe"])
        score = 50 + (positive_hits * 8) - (negative_hits * 8)
        score = max(0, min(100, score))
        tone = "positive" if score >= 60 else "negative" if score <= 40 else "mixed"
        signals = [item.title for item in news[:4]]

        return AgentFinding(
            agent=self.name,
            summary=f"Recent news flow appears {tone} based on {len(news)} headline(s).",
            confidence=0.62,
            signals=signals,
            data={"score": score, "positive_hits": positive_hits, "negative_hits": negative_hits},
        )
