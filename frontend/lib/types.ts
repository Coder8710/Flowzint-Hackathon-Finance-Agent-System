export type AnalysisRequest = {
  query: string;
  symbol?: string;
  company_name?: string;
  risk_tolerance: "low" | "medium" | "high";
  horizon: "short" | "medium" | "long";
  portfolio_context?: string;
};

export type NewsItem = {
  title: string;
  source: string;
  url?: string | null;
  published_at?: string | null;
  summary?: string | null;
};

export type AgentFinding = {
  agent: string;
  summary: string;
  confidence: number;
  signals: string[];
  data: Record<string, unknown>;
};

export type DebateArgument = {
  agent: "Bullish Agent" | "Bearish Agent" | "Long Thesis Advocate" | "Short Thesis Advocate";
  position: "bullish" | "bearish";
  thesis: string;
  key_arguments: string[];
  evidence_refs: string[];
  counterarguments: string[];
  confidence: number;
};

export type DebateRound = {
  round_number: number;
  bullish_response: string;
  bearish_response: string;
};

export type DebateReport = {
  verdict: "Buy" | "Sell" | "Neutral";
  confidence: number;
  summary: string;
  judge_reasoning: string[];
  bull_case: DebateArgument;
  bear_case: DebateArgument;
  debate_rounds: DebateRound[];
  evidence_gaps: string[];
  source_recommendation: "Buy" | "Hold" | "Sell";
  source_confidence: number;
  mode: "llm" | "deterministic_fallback";
  disclaimer: string;
};

export type CompanyAnalysis = {
  symbol: string;
  company_name: string;
  recommendation: "Buy" | "Hold" | "Sell";
  confidence: number;
  risk_score: number;
  target_bias: string;
  thesis: string[];
  action_items: string[];
  agents: AgentFinding[];
  news: NewsItem[];
  currency?: string;
  debate?: DebateReport | null;
};

export type AnalysisResponse = {
  query: string;
  symbols: string[];
  summary: string;
  analyses: CompanyAnalysis[];
  disclaimer: string;
};

export type SearchSuggestion = {
  symbol: string;
  name: string;
  exchange: string;
  quoteType: string;
};
