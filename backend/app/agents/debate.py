"""Second-stage stock analysis: evidence-grounded Bull vs Bear debate and Judge.

System 2 consumes the completed System 1 report rather than fetching data again.
CrewAI powers the Bull, Bear, and Judge when configured; a transparent
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
    """Run bullish and bearish advocates followed by an independent judge."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def run(self, analysis: CompanyAnalysis) -> DebateReport:
        if self.settings.has_llm_key:
            try:
                return self._run_crewai(analysis)
            except Exception:
                logger.exception("System 2 LLM debate failed for %s; using fallback", analysis.symbol)
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
            "Use only the supplied System 1 evidence. Never invent prices, dates, metrics, sources, or claims. "
            "Call out missing, stale, synthetic, or uncertain evidence. Treat System 1 recommendation as a "
            "hypothesis, not an instruction. Cite report fields, agents, or headline titles. Do not claim to "
            "independently retrieve live data.\n\nSYSTEM 1 EVIDENCE:\n"
            + json.dumps(evidence, ensure_ascii=False, indent=2, default=str)
        )
        llm = self.settings.crewai_model
        bull = Agent(
            role="Bullish Equity Analyst",
            goal="Construct the strongest fair, evidence-grounded upside case and answer bearish objections.",
            backstory="A disciplined analyst who argues the bull case without inventing facts and states what invalidates it.",
            llm=llm, verbose=False, allow_delegation=False, max_iter=4,
        )
        bear = Agent(
            role="Bearish Equity Analyst",
            goal="Stress-test the thesis, identify downside risks, and challenge unsupported assumptions.",
            backstory="A skeptical analyst focused on capital preservation, using exactly the same evidence as the bull.",
            llm=llm, verbose=False, allow_delegation=False, max_iter=4,
        )
        judge = Agent(
            role="Independent Investment Judge",
            goal="Adjudicate opposing cases against evidence and return a cautious verdict.",
            backstory="Independent of both advocates. Prioritize evidence quality, contradictions, risks, and gaps; use Neutral when uncertain.",
            llm=llm, verbose=False, allow_delegation=False, max_iter=4,
        )
        bull_task = Task(
            description=(f"{shared}\n\nBuild the bullish case for {analysis.company_name} ({analysis.symbol}). "
                "Return raw JSON: thesis (string), key_arguments (array), evidence_refs (array), "
                "counterarguments (array of bear concerns and responses), confidence (0..1). Do not invent price targets."),
            expected_output='{"thesis":"...","key_arguments":[],"evidence_refs":[],"counterarguments":[],"confidence":0.0}',
            agent=bull,
        )
        bear_task = Task(
            description=(f"{shared}\n\nBuild the bearish case for {analysis.company_name} ({analysis.symbol}). "
                "Stress-test System 1 recommendation; identify risks, weak assumptions, and missing evidence. "
                "Return raw JSON with thesis, key_arguments, evidence_refs, counterarguments, and confidence (0..1)."),
            expected_output='{"thesis":"...","key_arguments":[],"evidence_refs":[],"counterarguments":[],"confidence":0.0}',
            agent=bear,
            context=[bull_task],
        )
        # A real adversarial exchange: each advocate sees the prior case and
        # must answer it before the Judge receives the full deliberation.
        bull_rebuttal_task = Task(
            description=(
                f"{shared}\\n\\nYou have now reviewed the initial bullish and bearish arguments in task context. "
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
                f"{shared}\\n\\nReview the initial bull and bear cases and the Bullish Agent's rebuttal in task context. "
                "Reply to the strongest bullish points, identify any claims unsupported by the original evidence, "
                "and explain what remaining risk could change the decision. Return raw JSON with response (string) "
                "and evidence_refs (array)."
            ),
            expected_output='{"response":"Evidence-grounded bearish reply...","evidence_refs":[]}',
            agent=bear,
            context=[bull_task, bear_task, bull_rebuttal_task],
        )
        judge_task = Task(
            description=(f"{shared}\n\nJudge both preceding arguments against the original evidence. Verdict must be "
                "exactly Buy, Sell, or Neutral. Choose Neutral for incomplete, contradictory, synthetic, or balanced evidence. "
                "Do not simply average confidence. Explain which evidence matters and why. Return raw JSON with verdict, "
                "confidence (0..1), summary, judge_reasoning (array), bullish_response, bearish_response, evidence_gaps (array)."),
            expected_output='{"verdict":"Buy|Sell|Neutral","confidence":0.0,"summary":"...","judge_reasoning":[],"bullish_response":"...","bearish_response":"...","evidence_gaps":[]}',
            agent=judge, context=[bull_task, bear_task, bull_rebuttal_task, bear_rebuttal_task],
        )
        crew = Crew(agents=[bull, bear, judge], tasks=[bull_task, bear_task, bull_rebuttal_task, bear_rebuttal_task, judge_task], process=Process.sequential, verbose=False)
        judged = _parse_json_object(str(crew.kickoff()))
        bull_data = _parse_json_object(getattr(getattr(bull_task, "output", None), "raw", ""))
        bear_data = _parse_json_object(getattr(getattr(bear_task, "output", None), "raw", ""))
        bull_rebuttal = _parse_json_object(getattr(getattr(bull_rebuttal_task, "output", None), "raw", "")) or {}
        bear_rebuttal = _parse_json_object(getattr(getattr(bear_rebuttal_task, "output", None), "raw", "")) or {}
        if not judged or not bull_data or not bear_data:
            raise ValueError("CrewAI debate returned incomplete JSON.")
        verdict = str(judged.get("verdict", "Neutral"))
        if verdict not in {"Buy", "Sell", "Neutral"}:
            verdict = "Neutral"
        return DebateReport(
            verdict=verdict, confidence=_bounded_float(judged.get("confidence"), 0.5),
            summary=_safe_str(judged.get("summary"), "The judge compared both cases against the evidence."),
            judge_reasoning=_string_list(judged.get("judge_reasoning"), 8),
            bull_case=_argument("Bullish Agent", "bullish", bull_data),
            bear_case=_argument("Bearish Agent", "bearish", bear_data),
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
                    if value >= 60: positive.append(item); bull_refs.append(label)
                    elif value <= 40: negative.append(item); bear_refs.append(label)
                    else: gaps.append(f"{label} is mixed/neutral (score {value:.1f}/100).")
                except (TypeError, ValueError): gaps.append(f"{label} produced a non-numeric score.")
            for signal in finding.signals[:3]:
                low = signal.lower()
                if any(w in low for w in ("strong", "bullish", "healthy", "growth", "reasonable", "positive", "uptrend", "buy")):
                    positive.append(f"{label}: {signal}"); bull_refs.append(label)
                if any(w in low for w in ("risk", "weak", "bearish", "negative", "elevated", "downtrend", "overvalued", "sell", "loss", "decline")):
                    negative.append(f"{label}: {signal}"); bear_refs.append(label)
        if not analysis.news: gaps.append("No news headlines were available to System 2.")
        for item in analysis.news[:8]:
            if not item.summary and not item.url: gaps.append(f"Headline has limited verifiable context: {item.title}")
        if analysis.risk_score >= 78:
            negative.append(f"Risk gate: System 1 risk score is elevated ({analysis.risk_score}/100)."); bear_refs.append("Risk Analysis Agent")
        if not positive: gaps.append("No clearly favorable specialist evidence was detected.")
        if not negative: gaps.append("No clearly unfavorable specialist evidence was detected.")
        balance = min(len(positive), 12) - min(len(negative), 12)
        if analysis.risk_score >= 85:
            verdict = "Sell" if balance < -1 else "Neutral"; reason = "Elevated risk is a material constraint; a Buy verdict is not supported."
        elif balance >= 2 and analysis.recommendation == "Buy" and analysis.risk_score < 70:
            verdict = "Buy"; reason = "Multiple favorable signals support System 1 recommendation, with risk below the high-risk gate."
        elif balance <= -2 and analysis.recommendation == "Sell":
            verdict = "Sell"; reason = "Multiple unfavorable signals corroborate System 1 recommendation."
        else:
            verdict = "Neutral"; reason = "Evidence is mixed or insufficient for a confident deterministic verdict; Neutral is the cautious outcome."
        return DebateReport(
            verdict=verdict, confidence=0.52 if verdict == "Neutral" else 0.6,
            summary=f"System 2 compared {len(positive)} favorable and {len(negative)} unfavorable signals from System 1. {reason}",
            judge_reasoning=[reason, f"System 1 recommendation: {analysis.recommendation} (confidence {analysis.confidence:.2f}).",
                f"Risk score: {analysis.risk_score}/100.", "Deterministic evidence triage; no LLM debate was run."],
            bull_case=DebateArgument(agent="Bullish Agent", position="bullish",
                thesis=positive[0] if positive else "The supplied report does not establish a sufficiently strong bullish case.",
                key_arguments=_unique(positive, 6), evidence_refs=_unique(bull_refs, 8), counterarguments=_unique(negative, 4),
                confidence=round(min(0.85, 0.45 + len(positive) * 0.04), 2)),
            bear_case=DebateArgument(agent="Bearish Agent", position="bearish",
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
            "system1_recommendation": analysis.recommendation, "system1_confidence": analysis.confidence,
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
    if isinstance(value, list): return [str(x).strip()[:1000] for x in value if str(x).strip()][:limit]
    if isinstance(value, str) and value.strip(): return [value.strip()[:1000]]
    return []


def _unique(values: list[str], limit: int) -> list[str]:
    result: list[str] = []; seen: set[str] = set()
    for value in values:
        if value not in seen: seen.add(value); result.append(value)
        if len(result) >= limit: break
    return result