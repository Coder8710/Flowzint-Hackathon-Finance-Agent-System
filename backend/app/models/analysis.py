from typing import Literal

from pydantic import BaseModel, Field


Recommendation = Literal["Buy", "Hold", "Sell"]
DebateVerdict = Literal["Buy", "Sell", "Neutral"]


class AnalysisRequest(BaseModel):
    query: str = Field(..., min_length=1, examples=["Analyze NVIDIA stock"])
    symbol: str | None = Field(default=None, description="Pre-resolved stock ticker; skips query parsing when provided.")
    company_name: str | None = Field(default=None, description="Display name corresponding to the pre-resolved symbol.")
    risk_tolerance: Literal["low", "medium", "high"] = "medium"
    horizon: Literal["short", "medium", "long"] = "medium"
    portfolio_context: str | None = Field(default=None, description="Optional portfolio notes used by the portfolio advisor.")


class NewsItem(BaseModel):
    title: str
    source: str
    url: str | None = None
    published_at: str | None = None
    summary: str | None = None


class AgentFinding(BaseModel):
    agent: str
    summary: str
    confidence: float = Field(..., ge=0, le=1)
    signals: list[str] = Field(default_factory=list)
    data: dict = Field(default_factory=dict)


class DebateArgument(BaseModel):
    agent: Literal["Bullish Agent", "Bearish Agent"]
    position: Literal["bullish", "bearish"]
    thesis: str
    key_arguments: list[str] = Field(default_factory=list)
    evidence_refs: list[str] = Field(default_factory=list)
    counterarguments: list[str] = Field(default_factory=list)
    confidence: float = Field(..., ge=0, le=1)


class DebateRound(BaseModel):
    round_number: int = Field(..., ge=1)
    bullish_response: str
    bearish_response: str


class DebateReport(BaseModel):
    verdict: DebateVerdict
    confidence: float = Field(..., ge=0, le=1)
    summary: str
    judge_reasoning: list[str] = Field(default_factory=list)
    bull_case: DebateArgument
    bear_case: DebateArgument
    debate_rounds: list[DebateRound] = Field(default_factory=list)
    evidence_gaps: list[str] = Field(default_factory=list)
    source_recommendation: Recommendation
    source_confidence: float = Field(..., ge=0, le=1)
    mode: Literal["llm", "deterministic_fallback"]
    disclaimer: str = "AI-generated research support, not financial advice. Verify source data and consult a licensed advisor before investing."


class CompanyAnalysis(BaseModel):
    symbol: str
    company_name: str
    recommendation: Recommendation
    confidence: float = Field(..., ge=0, le=1)
    risk_score: int = Field(..., ge=0, le=100)
    target_bias: str
    thesis: list[str]
    action_items: list[str]
    agents: list[AgentFinding]
    news: list[NewsItem] = Field(default_factory=list)
    currency: str | None = None
    debate: DebateReport | None = None


class AnalysisResponse(BaseModel):
    query: str
    symbols: list[str]
    summary: str
    analyses: list[CompanyAnalysis]
    disclaimer: str
