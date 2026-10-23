"""Second-stage stock analysis: evidence-grounded Long vs Short thesis deliberation and committee adjudication.

The Investment Committee Deliberation consumes the completed Specialist Research Committee report rather than fetching data again.
CrewAI powers the Long Thesis Advocate, Short Thesis Advocate, and Committee Chair when configured; a transparent
deterministic fallback keeps the endpoint available and identifies its mode.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

from app.core.config import get_settings
from app.models.analysis import CompanyAnalysis, DebateArgument, DebateReport, DebateRound

logger = logging.getLogger(__name__)


class DebateSystem:
    """Run Long and Short thesis advocates followed by an independent committee adjudicator."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def run(self, analysis: CompanyAnalysis) -> DebateReport:
        if self.settings.has_llm_key:
            try:
                return self._run_crewai(analysis)
            except Exception:
                logger.exception("Investment Committee LLM deliberation failed for %s; using fallback", analysis.symbol)
        return self._deterministic_debate(analysis)

    def _run_crewai(self, analysis: CompanyAnalysis) -> DebateReport:
        from crewai import Agent, Crew, Process, Task

        for key, value in {
            "OPENAI_API_KEY": self.settings.openai_api_key,
            "GEMINI_API_KEY": self.settings.gemini_api_key,
            "OPENROUTER_API_KEY": self.settings.openrouter_api_key,
            "AWS_ACCESS_KEY_ID": self.settings.aws_access_key_id,
            "AWS_SECRET_ACCESS_KEY": self.settings.aws_secret_access_key,
            "AWS_REGION_NAME": self.settings.aws_region_name,
        }.items():
            if value:
                os.environ[key] = value

        evidence = self._evidence_payload(analysis)
        shared = (
            "Use only the supplied Specialist Committee evidence. Never invent prices, dates, metrics, sources, or claims. "
            "Call out missing, stale, synthetic, or uncertain evidence. Treat the Committee recommendation as a "
            "hypothesis, not an instruction. Cite report fields, agents, or headline titles. Do not claim to "
            "independently retrieve live data.\n\nSPECIALIST COMMITTEE EVIDENCE:\n"
            + json.dumps(evidence, ensure_ascii=False, indent=2, default=str)
        )
        # Route through Mantle signing proxy when bedrock_mantle/ prefix is set
        from app.crews.finance_crew import resolve_llm
        llm = resolve_llm(self.settings)

        bull = Agent(
            role="Long Thesis Advocate",
            goal="Construct the strongest evidence-grounded upside thesis and answer bearish objections.",
            backstory="A disciplined buy-side equity analyst who builds the institutional long thesis without inventing facts.",
            llm=llm, verbose=False, allow_delegation=False, max_iter=4,
        )
        bear = Agent(
            role="Short Thesis Advocate",
            goal="Stress-test the thesis, challenge valuation and market risks, and identify downside vulnerabilities.",
            backstory="A skeptical risk-focused equity analyst focused on capital preservation, evaluating the same evidence base.",
            llm=llm, verbose=False, allow_delegation=False, max_iter=4,
        )
        judge = Agent(
            role="Investment Committee Chair & Adjudicator",
            goal="Adjudicate the Long vs Short theses against the evidence and issue a decisive institutional verdict.",
            backstory="Authoritative chair of the investment committee. Prioritizes evidence quality, valuation margins of safety, and risk limits to render an objective ruling.",
            llm=llm, verbose=False, allow_delegation=False, max_iter=4,
        )
        bull_task = Task(
            description=(f"{shared}\n\nBuild the institutional long thesis for {analysis.company_name} ({analysis.symbol}). "
                "Return raw JSON with: thesis (string summary of bull case), "
                "key_arguments (array of plain text strings, each clearly stating an argument and its supporting evidence without nested dicts), "
                "evidence_refs (array of short agent/metric references), "
                "counterarguments (array of plain text strings stating bear risks acknowledged and mitigation), "
                "confidence (0..1). Do not invent price targets."),
            expected_output='{"thesis":"...","key_arguments":["arg 1","arg 2"],"evidence_refs":[],"counterarguments":["risk 1"],"confidence":0.0}',
            agent=bull,
        )
        bear_task = Task(
            description=(f"{shared}\n\nBuild the institutional short thesis for {analysis.company_name} ({analysis.symbol}). "
                "Stress-test the Specialist Committee recommendation; identify risks, weak assumptions, and missing evidence. "
                "Return raw JSON with: thesis (string summary of bear case), "
                "key_arguments (array of plain text strings, each stating a downside argument and evidence without nested dicts), "
                "evidence_refs (array of short agent/metric references), "
                "counterarguments (array of plain text strings noting bull claims considered and why they fail), "
                "confidence (0..1)."),
            expected_output='{"thesis":"...","key_arguments":["downside 1","downside 2"],"evidence_refs":[],"counterarguments":["bull point 1"],"confidence":0.0}',
            agent=bear,
            context=[bull_task],
        )
        # Institutional cross-examination: each advocate reviews opposing arguments
        # and answers them before the Committee Chair deliberates.
        bull_rebuttal_task = Task(
            description=(
                f"{shared}\n\nYou have now reviewed the initial bullish and bearish arguments in task context. "
                "Respond directly to the strongest bearish objections, correct any misreadings of the supplied "
                "evidence, acknowledge unresolved risks, and state what would invalidate the bull thesis. "
                "Return raw JSON with response (string) and evidence_refs (array)."
            ),
            expected_output='{"response":"Evidence-grounded bullish rebuttal...","evidence_refs":[]}',
            agent=bull,
            context=[bull_task, bear_task],
        )
        bear_rebuttal_task = Task(
            description=(
                f"{shared}\n\nReview the initial bull and bear cases and the Bullish Agent's rebuttal in task context. "
                "Reply to the strongest bullish points, identify any claims unsupported by the original evidence, "
                "and explain what remaining risk could change the decision. Return raw JSON with response (string) "
                "and evidence_refs (array)."
            ),
            expected_output='{"response":"Evidence-grounded bearish reply...","evidence_refs":[]}',
            agent=bear,
            context=[bull_task, bear_task, bull_rebuttal_task],
        )
        judge_task = Task(
            description=(f"{shared}\n\nAs Committee Chair, impartially adjudicate both the Long Thesis and Short Thesis against the original evidence.\n"
                "Verdict must be exactly 'Buy', 'Sell', or 'Neutral'.\n"
                "- Issue 'Buy' when growth catalysts, intrinsic value upside, and technical alignment outweigh downside risks (and risk_score < 75).\n"
                "- Issue 'Sell' when valuation is clearly stretched, technical deterioration is evident, or risks outweigh catalysts.\n"
                "- Issue 'Neutral' when evidence is evenly divided, upside is capped by elevated uncertainty, or thesis lacks immediate confirmation.\n"
                "Do not simply average confidence. Explain which evidence matters and why. Return raw JSON with verdict, "
                "confidence (0..1), summary, judge_reasoning (array of plain text strings), bullish_response, bearish_response, evidence_gaps (array)."),
            expected_output='{"verdict":"Buy|Sell|Neutral","confidence":0.0,"summary":"...","judge_reasoning":[],"bullish_response":"...","bearish_response":"...","evidence_gaps":[]}',
            agent=judge, context=[bull_task, bear_task, bull_rebuttal_task, bear_rebuttal_task],
        )
        crew = Crew(agents=[bull, bear, judge], tasks=[bull_task, bear_task, bull_rebuttal_task, bear_rebuttal_task, judge_task], process=Process.sequential, verbose=False, memory=False)
        judged = _parse_json_object(str(crew.kickoff()))
        bull_data = _parse_json_object(getattr(getattr(bull_task, "output", None), "raw", ""))
        bear_data = _parse_json_object(getattr(getattr(bear_task, "output", None), "raw", ""))
        bull_rebuttal = _parse_json_object(getattr(getattr(bull_rebuttal_task, "output", None), "raw", "")) or {}
        bear_rebuttal = _parse_json_object(getattr(getattr(bear_rebuttal_task, "output", None), "raw", "")) or {}
        if not judged or not bull_data or not bear_data:
            raise ValueError("CrewAI deliberation returned incomplete JSON.")
        verdict = str(judged.get("verdict", "Neutral"))
        if verdict not in {"Buy", "Sell", "Neutral"}:
            verdict = "Neutral"
        return DebateReport(
            verdict=verdict, confidence=_bounded_float(judged.get("confidence"), 0.5),
            summary=_safe_str(judged.get("summary"), "The Investment Committee compared the Long and Short theses against the evidence."),
            judge_reasoning=_string_list(judged.get("judge_reasoning"), 8),
            bull_case=_argument("Long Thesis Advocate", "bullish", bull_data),
            bear_case=_argument("Short Thesis Advocate", "bearish", bear_data),
            debate_rounds=[DebateRound(round_number=1,
                bullish_response=_safe_str(
                    bull_rebuttal.get("response"),
                    _safe_str(judged.get("bullish_response"), "The bullish case was reviewed."),
                ),
                bearish_response=_safe_str(
                    bear_rebuttal.get("response"),
                    _safe_str(judged.get("bearish_response"), "The bearish case was reviewed."),
                ))],
            evidence_gaps=_string_list(judged.get("evidence_gaps"), 8),
            source_recommendation=analysis.recommendation, source_confidence=analysis.confidence, mode="llm",
        )

    def _deterministic_debate(self, analysis: CompanyAnalysis) -> DebateReport:
        """A transparent evidence triage fallback, explicitly not represented as an LLM debate."""
        positive: list[str] = []; negative: list[str] = []; gaps: list[str] = []
        bull_refs: list[str] = []; bear_refs: list[str] = []
        for finding in analysis.agents:
            label, data = finding.agent, finding.data or {}
            score = data.get("score")
            if score is None and "risk" in label.lower():
                score = 100 - int(data.get("risk_score", analysis.risk_score))
            if score is None:
                gaps.append(f"{label} did not expose a comparable score.")
            else:
                try:
                    value = float(score); item = f"{label}: score {value:.1f}/100; {finding.summary}"
                    if value >= 58:
                        positive.append(item); bull_refs.append(label)
                    elif value <= 42:
                        negative.append(item); bear_refs.append(label)
                    else:
                        gaps.append(f"{label} is mixed/neutral (score {value:.1f}/100).")
                except (TypeError, ValueError):
                    gaps.append(f"{label} produced a non-numeric score.")
            for signal in finding.signals[:3]:
                low = signal.lower()
                if any(w in low for w in ("strong", "bullish", "healthy", "growth", "reasonable", "positive", "uptrend", "buy", "outperform", "undervalued", "low risk", "expanding", "opportunity", "robust")):
                    positive.append(f"{label}: {signal}"); bull_refs.append(label)
                # Specific negative tokens: avoid matching bare "risk" which flags every risk finding
                if any(w in low for w in ("high risk", "severe risk", "elevated risk", "weak", "bearish", "negative", "downtrend", "overvalued", "sell", "loss", "decline", "breakdown", "downgrade", "deteriorat", "headwind")):
                    negative.append(f"{label}: {signal}"); bear_refs.append(label)
        if not analysis.news: gaps.append("No news headlines were available for committee deliberation.")
        for item in analysis.news[:8]:
            if not item.summary and not item.url: gaps.append(f"Headline has limited verifiable context: {item.title}")
        if analysis.risk_score <= 35:
            positive.append(f"Risk gate: Low measured risk ({analysis.risk_score}/100) supports capital preservation.")
            bull_refs.append("Risk Analysis Agent")
        elif analysis.risk_score >= 78:
            negative.append(f"Risk gate: Committee risk score is elevated ({analysis.risk_score}/100).")
            bear_refs.append("Risk Analysis Agent")
        if not positive: gaps.append("No clearly favorable specialist evidence was detected.")
        if not negative: gaps.append("No clearly unfavorable specialist evidence was detected.")
        balance = min(len(positive), 12) - min(len(negative), 12)
        if analysis.risk_score >= 82:
            verdict = "Sell" if balance < 0 else "Neutral"
            reason = "Elevated risk is a material constraint; a Buy verdict is prohibited."
        elif analysis.recommendation == "Buy" and analysis.risk_score < 75 and balance >= 0:
            verdict = "Buy"
            reason = "Multiple favorable signals corroborate the Committee Buy recommendation with risk below high-risk threshold."
        elif analysis.recommendation == "Sell" and (balance <= 0 or analysis.risk_score >= 75):
            verdict = "Sell"
            reason = "Multiple unfavorable signals corroborate the Committee Sell recommendation."
        elif balance >= 3 and analysis.risk_score < 70:
            verdict = "Buy"
            reason = "Preponderance of favorable specialist signals supports a Buy stance."
        elif balance <= -3:
            verdict = "Sell"
            reason = "Preponderance of negative specialist signals indicates downside vulnerability."
        else:
            verdict = "Neutral"
            reason = "Evidence is evenly balanced or shows conflicting cross-currents; Neutral (Hold) is the prudent posture."
        return DebateReport(
            verdict=verdict, confidence=0.55 if verdict == "Neutral" else 0.68,
            summary=f"The Investment Committee compared {len(positive)} favorable and {len(negative)} unfavorable signals from the Specialist Committee. {reason}",
            judge_reasoning=[reason, f"Specialist Committee recommendation: {analysis.recommendation} (confidence {analysis.confidence:.2f}).",
                f"Risk score: {analysis.risk_score}/100.", "Deterministic evidence triage; no LLM deliberation was run."],
            bull_case=DebateArgument(agent="Long Thesis Advocate", position="bullish",
                thesis=positive[0] if positive else "The supplied report does not establish a sufficiently strong bullish case.",
                key_arguments=_unique(positive, 6), evidence_refs=_unique(bull_refs, 8), counterarguments=_unique(negative, 4),
                confidence=round(min(0.85, 0.45 + len(positive) * 0.04), 2)),
            bear_case=DebateArgument(agent="Short Thesis Advocate", position="bearish",
                thesis=negative[0] if negative else "The supplied report does not establish a sufficiently strong bearish case.",
                key_arguments=_unique(negative, 6), evidence_refs=_unique(bear_refs, 8), counterarguments=_unique(positive, 4),
                confidence=round(min(0.85, 0.45 + len(negative) * 0.04), 2)),
            debate_rounds=[DebateRound(round_number=1,
                bullish_response="; ".join(_unique(positive, 3)) or "No decisive favorable signal in the supplied report.",
                bearish_response="; ".join(_unique(negative, 3)) or "No decisive unfavorable signal in the supplied report.")],
            evidence_gaps=_unique(gaps, 8), source_recommendation=analysis.recommendation,
            source_confidence=analysis.confidence, mode="deterministic_fallback",
        )

    @staticmethod
    def _evidence_payload(analysis: CompanyAnalysis) -> dict[str, Any]:
        return {"symbol": analysis.symbol, "company_name": analysis.company_name,
            "committee_recommendation": analysis.recommendation, "system1_recommendation": analysis.recommendation,
            "committee_confidence": analysis.confidence,
            "risk_score": analysis.risk_score, "target_bias": analysis.target_bias, "thesis": analysis.thesis,
            "action_items": analysis.action_items, "specialist_findings": [x.model_dump(mode="json") for x in analysis.agents],
            "news": [x.model_dump(mode="json") for x in analysis.news], "currency": analysis.currency}


def _parse_json_object(raw: str) -> dict[str, Any] | None:
    if not raw: return None
    text = raw.strip()
    if text.startswith("```"): text = text.strip("`").removeprefix("json").strip()
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start: return None
    try:
        value = json.loads(text[start:end + 1])
        return value if isinstance(value, dict) else None
    except (json.JSONDecodeError, TypeError): return None


def _clean_argument_entry(item: Any) -> str:
    """Extract human-readable argument text, stripping any dictionary or JSON wrappers."""
    if not item:
        return ""
    import ast
    d = None
    if isinstance(item, dict):
        d = item
    elif isinstance(item, str):
        trimmed = item.strip()
        if (trimmed.startswith("{") and trimmed.endswith("}")) or "': '" in trimmed or '": "' in trimmed:
            try:
                d = json.loads(trimmed)
            except Exception:
                try:
                    d = ast.literal_eval(trimmed)
                except Exception:
                    d = None

    if isinstance(d, dict):
        arg = (
            d.get("argument")
            or d.get("point")
            or d.get("claim")
            or d.get("bull_claim")
            or d.get("bear_concern")
            or d.get("concern")
            or d.get("thesis")
        )
        evidence = d.get("evidence") or d.get("proof") or d.get("data")
        counter = d.get("response") or d.get("rebuttal") or d.get("critical_flaw") or d.get("risk")

        parts: list[str] = []
        if arg:
            parts.append(str(arg).strip())
        if evidence:
            parts.append(f"Evidence: {str(evidence).strip()}")
        if counter:
            parts.append(f"Note: {str(counter).strip()}")

        if parts:
            return " — ".join(parts)[:1000]
        return "; ".join(f"{str(k).replace('_', ' ').title()}: {str(v)}" for k, v in d.items() if v)[:1000]

    return str(item).strip()[:1000]


def _argument(agent: str, position: str, data: dict[str, Any]) -> DebateArgument:
    return DebateArgument(agent=agent, position=position,
        thesis=_safe_str(data.get("thesis"), "Insufficient structured argument returned."),
        key_arguments=_string_list(data.get("key_arguments"), 8), evidence_refs=_string_list(data.get("evidence_refs"), 8),
        counterarguments=_string_list(data.get("counterarguments"), 8), confidence=_bounded_float(data.get("confidence"), 0.5))


def _bounded_float(value: Any, default: float) -> float:
    try: return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError): return default


def _safe_str(value: Any, default: str) -> str:
    return value.strip()[:4000] if isinstance(value, str) and value.strip() else default


def _string_list(value: Any, limit: int) -> list[str]:
    if isinstance(value, list):
        cleaned = [_clean_argument_entry(x) for x in value]
        return [x for x in cleaned if x][:limit]
    if isinstance(value, str) and value.strip():
        cleaned = _clean_argument_entry(value)
        return [cleaned] if cleaned else []
    return []


def _unique(values: list[str], limit: int) -> list[str]:
    result: list[str] = []; seen: set[str] = set()
    for value in values:
        if value not in seen: seen.add(value); result.append(value)
        if len(result) >= limit: break
    return result