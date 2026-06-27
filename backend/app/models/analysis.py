from typing import Literal

from pydantic import BaseModel, Field


Recommendation = Literal["Buy", "Hold", "Sell"]


class AnalysisRequest(BaseModel):
    query: str = Field(..., min_length=1, examples=["Analyze NVIDIA stock"])
    symbol: str | None = Field(
        default=None,
        description="Pre-resolved stock ticker (e.g. APOLLOHOSP.NS). If provided, skips query parsing.",
    )
    company_name: str | None = Field(
        default=None,
        description="Company display name corresponding to the pre-resolved symbol.",
    )
    risk_tolerance: Literal["low", "medium", "high"] = "medium"
    horizon: Literal["short", "medium", "long"] = "medium"
    portfolio_context: str | None = Field(
        default=None,
        description="Optional user portfolio notes used by the portfolio advisor agent.",
    )



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


class AnalysisResponse(BaseModel):
    query: str
    symbols: list[str]
    summary: str
    analyses: list[CompanyAnalysis]
    disclaimer: str
