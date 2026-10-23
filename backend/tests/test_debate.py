import unittest

from app.agents.debate import DebateSystem
from app.models.analysis import AgentFinding, CompanyAnalysis, NewsItem


def make_analysis(*, recommendation="Hold", risk_score=45, agents=None, news=None):
    return CompanyAnalysis(
        symbol="TEST.NS",
        company_name="Test Company",
        recommendation=recommendation,
        confidence=0.7,
        risk_score=risk_score,
        target_bias="Mixed signals",
        thesis=["Example thesis based on supplied report."],
        action_items=["Review the next earnings release."],
        agents=agents or [
            AgentFinding(agent="Fundamental Analysis Agent", summary="Fundamentals are balanced.", confidence=0.7, signals=[], data={"score": 55}),
            AgentFinding(agent="Technical Analysis Agent", summary="Technical signals are mixed.", confidence=0.6, signals=[], data={"score": 50}),
        ],
        news=news or [],
        currency="INR",
    )


class DebateSystemTests(unittest.TestCase):
    def setUp(self):
        self.system = DebateSystem()

    def test_fallback_returns_neutral_when_evidence_is_insufficient(self):
        report = self.system._deterministic_debate(make_analysis())
        self.assertEqual(report.verdict, "Neutral")
        self.assertEqual(report.mode, "deterministic_fallback")
        self.assertEqual(report.source_recommendation, "Hold")
        self.assertGreaterEqual(report.confidence, 0)
        self.assertLessEqual(report.confidence, 1)
        self.assertEqual(report.bull_case.agent, "Bullish Agent")
        self.assertEqual(report.bear_case.agent, "Bearish Agent")

    def test_high_risk_prevents_automatic_buy_verdict(self):
        agents = [
            AgentFinding(agent="Fundamental Analysis Agent", summary="Favorable fundamentals.", confidence=0.8, signals=[], data={"score": 75}),
            AgentFinding(agent="Technical Analysis Agent", summary="Favorable trend.", confidence=0.8, signals=[], data={"score": 72}),
            AgentFinding(agent="Risk Analysis Agent", summary="Very elevated risk.", confidence=0.7, signals=[], data={"score": 15, "risk_score": 85}),
        ]
        report = self.system._deterministic_debate(make_analysis(recommendation="Buy", risk_score=85, agents=agents))
        self.assertNotEqual(report.verdict, "Buy")
        self.assertTrue(any("risk" in item.lower() for item in report.judge_reasoning))

    def test_debate_payload_is_limited_to_system_one_report(self):
        analysis = make_analysis(news=[
            NewsItem(title="Quarterly results", source="Example source", url="https://example.com/results")
        ])
        payload = self.system._evidence_payload(analysis)
        self.assertEqual(payload["symbol"], analysis.symbol)
        self.assertEqual(payload["system1_recommendation"], analysis.recommendation)
        self.assertEqual(payload["specialist_findings"][0]["agent"], analysis.agents[0].agent)
        self.assertEqual(payload["news"][0]["title"], "Quarterly results")
        self.assertNotIn("fresh_market_data", payload)


if __name__ == "__main__":
    unittest.main()
