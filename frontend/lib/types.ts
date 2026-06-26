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
