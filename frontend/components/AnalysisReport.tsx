import { useState } from "react";
import { 
  AlertTriangle, 
  BarChart3, 
  Newspaper, 
  ShieldCheck, 
  Target, 
  TrendingUp, 
  HelpCircle,
  Activity,
  CheckCircle,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Scale,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ListOrdered
} from "lucide-react";
import { CompanyAnalysis, AgentFinding } from "@/lib/types";
import { MetricBar } from "./MetricBar";
import { TrendSparkline } from "./TrendSparkline";
import { formatCurrencySymbols } from "@/lib/currency";
import { parseArgumentEntry, DebateArenaModal } from "./DebateArenaModal";

const agentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "News & Macro Specialist": Newspaper,
  "Fundamental Analysis Agent": BarChart3,
  "Technical Analysis Agent": TrendingUp,
  "Sentiment Analysis Agent": Target,
  "Risk Analysis Agent": ShieldCheck,
  "Portfolio Advisor Agent": HelpCircle,
};

function renderTextWithLinks(text: string) {
  if (typeof text !== 'string') return text;
  const urlRegex = /(https?:\/\/[^\s"',)]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-mint hover:text-mint/80 transition-colors hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface RankedAction {
  step: number;
  priorityLabel: string;
  badgeClass: string;
  dotColor: string;
  title: string;
  body: string;
}

function rankAndFormatActions(actions: string[], recommendation: string): RankedAction[] {
  if (!actions || actions.length === 0) return [];

  const scored = actions.map((rawAction, originalIdx) => {
    const text = rawAction.trim();
    const low = text.toLowerCase();
    let score = 50 + originalIdx;
    let label = "Priority · Execution Step";
    let badgeClass = "border-indigo-500/30 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400";
    let dotColor = "bg-indigo-500";

    // 1. Entry / Immediate Buy or Sell Execution
    if (
      low.includes("immediate") ||
      low.includes("limit buy") ||
      low.includes("entry trigger") ||
      low.includes("gtc limit") ||
      low.includes("action 1") ||
      (recommendation === "Buy" && (low.includes("entry") || low.includes("starter position") || low.includes("buy at"))) ||
      (recommendation === "Sell" && (low.includes("exit") || low.includes("sell") || low.includes("liquidate")))
    ) {
      score = 10;
      label = "Priority 1 · Immediate Trigger";
      badgeClass = recommendation === "Sell" 
        ? "border-rose-500/30 bg-rose-500/10 text-rose-500" 
        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";
      dotColor = recommendation === "Sell" ? "bg-rose-500" : "bg-emerald-500";
    }
    // 2. Stop-Loss & Capital Preservation
    else if (
      low.includes("stop-loss") ||
      low.includes("hard stop") ||
      low.includes("trailing stop") ||
      low.includes("risk protocol") ||
      low.includes("action 2") ||
      low.includes("protect capital")
    ) {
      score = 20;
      label = "Priority 2 · Risk & Stop-Loss Protocol";
      badgeClass = "border-amber-500/30 bg-amber-500/10 text-amber-500";
      dotColor = "bg-amber-500";
    }
    // 3. Profit-Taking / Position Target / Tranche Deployment
    else if (
      low.includes("profit-taking") ||
      low.includes("price target") ||
      low.includes("tranche") ||
      low.includes("trim") ||
      low.includes("action 3") ||
      low.includes("action 4")
    ) {
      score = 30;
      label = "Priority 3 · Profit & Tranche Target";
      badgeClass = "border-blue-500/30 bg-blue-500/10 text-blue-500";
      dotColor = "bg-blue-500";
    }
    // 4. Catalyst & Earnings Watch
    else if (
      low.includes("earnings") ||
      low.includes("catalyst") ||
      low.includes("review date") ||
      low.includes("quarterly")
    ) {
      score = 40;
      label = "Priority 4 · Catalyst & Earnings Date";
      badgeClass = "border-purple-500/30 bg-purple-500/10 text-purple-400";
      dotColor = "bg-purple-500";
    }
    // 5. Invalidation Rule / Emergency Exit
    else if (
      low.includes("invalidation") ||
      low.includes("cancel") ||
      low.includes("exit thesis") ||
      low.includes("action 5")
    ) {
      score = 50;
      label = "Priority 5 · Thesis Invalidation Rule";
      badgeClass = "border-steel/30 bg-steel/10 text-steel";
      dotColor = "bg-steel";
    }

    return { text, score, label, badgeClass, dotColor, originalIdx };
  });

  // Sort strictly by score ascending
  scored.sort((a, b) => a.score - b.score);

  return scored.map((item, idx) => {
    const step = idx + 1;
    let title = `Action Step ${step}`;
    let body = item.text;

    // Split clean title from body if possible
    if (item.text.includes(":") && item.text.indexOf(":") < 50) {
      const parts = item.text.split(":");
      title = parts[0].replace(/^Action \d+\s*[-–]?\s*/i, "").replace(/\(min \d+ words\)/i, "").trim();
      body = parts.slice(1).join(":").trim();
    } else {
      const firstPeriod = item.text.indexOf(". ");
      if (firstPeriod > 0 && firstPeriod < 60) {
        title = item.text.substring(0, firstPeriod).replace(/^Action \d+\s*[-–]?\s*/i, "").trim();
        body = item.text.substring(firstPeriod + 2).trim();
      }
    }

    return {
      step,
      priorityLabel: item.label.replace(/Priority \d/, `Priority ${step}`),
      badgeClass: item.badgeClass,
      dotColor: item.dotColor,
      title,
      body,
    };
  });
}

const THESIS_PILLAR_META = [
  { label: "Pillar 1 · Valuation & Intrinsic Value", icon: "💎" },
  { label: "Pillar 2 · Growth Catalyst & Runway", icon: "🚀" },
  { label: "Pillar 3 · Technical Setup & Levels", icon: "📊" },
  { label: "Pillar 4 · Economic Moat & Peers", icon: "🏰" },
  { label: "Pillar 5 · Risk vs Reward Ratio", icon: "⚖️" },
  { label: "Pillar 6 · Macro & Sector Drivers", icon: "🌐" },
];

function parseThesisPillar(text: string, index: number) {
  const meta = THESIS_PILLAR_META[index] || {
    label: `Pillar ${index + 1} · Strategic Driver`,
    icon: "📌",
  };

  let headline = "";
  let deepDive = text;

  const firstDot = text.indexOf(". ");
  if (firstDot > 0 && firstDot < 140) {
    headline = text.substring(0, firstDot + 1).trim();
    deepDive = text.substring(firstDot + 2).trim();
  } else {
    headline = text.substring(0, 90).trim() + "...";
  }

  return { pillar: meta, meta, headline, deepDive, fullText: text };
}

export function AnalysisReport({ analysis, overrideCompanyName }: { analysis: CompanyAnalysis; overrideCompanyName?: string }) {
  const [activeAgentIndex, setActiveAgentIndex] = useState<number>(0);
  const [isDebateArenaOpen, setIsDebateArenaOpen] = useState(false);
  const [showAllBullArgs, setShowAllBullArgs] = useState(false);
  const [showBullRisks, setShowBullRisks] = useState(false);
  const [showAllBearArgs, setShowAllBearArgs] = useState(false);
  const [showBearPoints, setShowBearPoints] = useState(false);
  const [showDetailedJudge, setShowDetailedJudge] = useState(false);
  const [isThesisExpanded, setIsThesisExpanded] = useState(false);
  const [expandedThesisIdx, setExpandedThesisIdx] = useState<number | null>(null);

  const technical = analysis.agents.find((agent) => agent.agent === "Technical Analysis Agent");
  
  const symbol = analysis.symbol;
  const rec = analysis.recommendation;
  const debate = analysis.debate;
  const displayName = overrideCompanyName || analysis.company_name;
  
  // Custom theme colors for recommendation banner
  const recColors = 
    rec === "Buy"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 shadow-[0_0_15px_rgba(8,153,129,0.08)]"
      : rec === "Sell"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400 shadow-[0_0_15px_rgba(242,54,69,0.08)]"
        : "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.08)]";

  const selectedAgent = analysis.agents[activeAgentIndex] || analysis.agents[0];

  // Render specific metrics depending on which agent tab is active
  const renderAgentTelemetry = (agent: AgentFinding) => {
    const data = agent.data || {};
    const name = agent.agent;

    if (name.includes("Fundamental")) {
      const metrics = (data.key_metrics as Record<string, unknown>) || {};
      return (
        <div className="grid grid-cols-2 gap-3.5 mt-4">
          <div className="bg-paper/40 border border-line p-3 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Moat Quality</span>
            <p className="text-sm font-extrabold text-ink mt-0.5 capitalize">{String(data.moat_rating || "None")}</p>
          </div>
          <div className="bg-paper/40 border border-line p-3 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Intrinsic Value</span>
            <p className="text-sm font-extrabold text-mint mt-0.5">
              {formatCurrencySymbols(String(data.intrinsic_value_estimate || "N/A"), symbol, analysis.currency)}
            </p>
          </div>
          <div className="bg-paper/40 border border-line p-3 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">P/E Ratio</span>
            <p className="font-mono-data text-xs font-bold text-ink mt-0.5">
              {String(metrics.pe_ratio || data.pe_ratio || "N/A")}
            </p>
          </div>
          <div className="bg-paper/40 border border-line p-3 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Debt-to-Equity</span>
            <p className="font-mono-data text-xs font-bold text-ink mt-0.5">
              {String(metrics.debt_to_equity || data.debt_to_equity || "N/A")}
            </p>
          </div>
        </div>
      );
    }

    if (name.includes("Technical")) {
      return (
        <div className="grid grid-cols-2 gap-3.5 mt-4">
          <div className="bg-paper/40 border border-line p-3 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Trend Direction</span>
            <p className="text-sm font-extrabold text-ink mt-0.5 capitalize">{String(data.trend_direction || "Sideways")}</p>
          </div>
          <div className="bg-paper/40 border border-line p-3 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Signal Action</span>
            <p className="text-sm font-extrabold text-mint mt-0.5 capitalize">{String(data.signal || "Wait")}</p>
          </div>
          <div className="bg-paper/40 border border-line p-3 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">14-Period RSI</span>
            <p className="font-mono-data text-xs font-bold text-ink mt-0.5">{String(data.rsi_reading || "N/A")}</p>
          </div>
          <div className="bg-paper/40 border border-line p-3 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Key Resistance</span>
            <p className="font-mono-data text-xs font-bold text-ink mt-0.5">
              {formatCurrencySymbols(String(data.key_resistance || "N/A"), symbol, analysis.currency)}
            </p>
          </div>
        </div>
      );
    }

    if (name.includes("News")) {
      const sourcesList = Array.isArray(data.sources) 
        ? data.sources.join(", ") 
        : typeof data.sources === "string" 
          ? data.sources 
          : "N/A";
      return (
        <div className="grid grid-cols-2 gap-3.5 mt-4">
          <div className="bg-paper/40 border border-line p-3 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Macro Impact</span>
            <p className="text-sm font-extrabold text-ink mt-0.5 capitalize">{String(data.impact_direction || "Neutral")}</p>
          </div>
          <div className="bg-paper/40 border border-line p-3 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Catalyst Category</span>
            <p className="text-sm font-extrabold text-ink mt-0.5 capitalize">{String(data.catalyst_type || "N/A")}</p>
          </div>
          <div className="bg-paper/40 border border-line p-3 rounded-xl col-span-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Coverage Sources</span>
            <div className="text-xs font-semibold text-ink mt-0.5 break-words">{renderTextWithLinks(sourcesList)}</div>
          </div>
        </div>
      );
    }

    if (name.includes("Sentiment")) {
      return (
        <div className="grid grid-cols-2 gap-3.5 mt-4">
          <div className="bg-paper/40 border border-line p-3 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Fear-Greed Index</span>
            <p className="text-sm font-extrabold text-ink mt-0.5 capitalize">{String(data.fear_greed_proxy || "Neutral")}</p>
          </div>
          <div className="bg-paper/40 border border-line p-3 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Retail Buzz Volume</span>
            <p className="text-sm font-extrabold text-ink mt-0.5 capitalize">{String(data.social_buzz_volume || "Medium")}</p>
          </div>
          <div className="bg-paper/40 border border-line p-3 rounded-xl col-span-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Net Positioning Bias</span>
            <p className="text-xs font-semibold text-ink mt-0.5 capitalize">{String(data.positioning_bias || "Neutral")}</p>
          </div>
        </div>
      );
    }

    if (name.includes("Risk")) {
      const isHigh = Number(data.risk_score || 50) > 65;
      return (
        <div className="grid grid-cols-2 gap-3.5 mt-4">
          <div className="bg-paper/40 border border-line p-3 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Raw Risk Score</span>
            <p className="text-sm font-extrabold text-ink mt-0.5 font-mono-data">{String(data.risk_score || "N/A")}/100</p>
          </div>
          <div className="bg-paper/40 border border-line p-3 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Risk Categorization</span>
            <p className={`text-sm font-extrabold mt-0.5 ${isHigh ? "text-berry" : "text-mint"}`}>
              {isHigh ? "High Volatility" : "Conservative"}
            </p>
          </div>
        </div>
      );
    }

    if (name.includes("Portfolio")) {
      const rationale = Array.isArray(data.rationale) ? data.rationale : [];
      return (
        <div className="grid grid-cols-1 gap-3.5 mt-4">
          <div className="bg-paper/40 border border-line p-4 rounded-xl leading-relaxed">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel">Fiduciary Advice</span>
            <p className="text-xs font-semibold text-mint mt-1">
              {formatCurrencySymbols(String(data.allocation_advice || "No advice provided"), symbol, analysis.currency)}
            </p>
          </div>
          {rationale.length > 0 && (
            <div className="bg-paper/40 border border-line p-4 rounded-xl leading-relaxed">
              <span className="text-[10px] font-black uppercase tracking-wider text-steel">Rationale</span>
              <ul className="text-xs font-semibold text-ink mt-1 list-disc pl-4 space-y-1">
                {rationale.map((r, i) => (
                  <li key={i}>{formatCurrencySymbols(String(r), symbol, analysis.currency)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="text-xs text-steel/65 italic mt-4">
        Structured variables are unavailable for this tab.
      </div>
    );
  };

  return (
    <section className="space-y-6 animate-fade-in-up">
      {/* Row 1: Overview & Chart (Horizontal wide layout) */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Company Overview Card */}
        <div className="rounded-2xl glass-panel p-6 card-hover relative overflow-hidden group flex flex-col justify-between">
          {/* Background design glow */}
          <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-20 transition-all duration-500 group-hover:scale-125 ${
            rec === "Buy" ? "bg-emerald-500" : rec === "Sell" ? "bg-rose-500" : "bg-amber-500"
          }`} />
          
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="font-mono-data text-xs font-bold uppercase tracking-widest text-mint bg-mint/5 px-2 py-0.5 rounded border border-mint/10">
                  {symbol.split(".")[0]}
                </span>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink break-words">
                  {displayName}
                </h2>
              </div>
              <span className={`shrink-0 border px-3.5 py-1.5 text-sm font-black rounded-lg uppercase tracking-wider ${recColors}`}>
                {rec}
              </span>
            </div>

            <p className="mt-4 text-[13px] font-medium text-steel leading-relaxed">
              {formatCurrencySymbols(analysis.target_bias, symbol, analysis.currency)}
            </p>
          </div>

          <div className="mt-6 space-y-4 pt-6 border-t border-line">
            <MetricBar label="AI Conviction Score" value={analysis.confidence * 100} tone="good" />
            <MetricBar label="Risk Score" value={analysis.risk_score} tone={analysis.risk_score > 65 ? "bad" : analysis.risk_score > 40 ? "warn" : "good"} />
          </div>
        </div>

        {/* Wide Trend Chart */}
        <div className="flex flex-col justify-between h-full min-h-[260px]">
          <TrendSparkline symbol={symbol} history={technical?.data.history} currency={analysis.currency} />
        </div>
      </div>

      {/* Adversarial Debate Arena: bull/bear debate and judge verdict */}
      {debate && (
        <div className="rounded-2xl glass-panel p-6 border border-line space-y-5 relative overflow-hidden">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/15">
                  <Activity className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                  Adversarial Debate Arena · Bull vs Bear
                </h3>
              </div>
              <p className="text-[13px] text-steel leading-relaxed max-w-2xl">
                {debate.summary}
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-start sm:items-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDebateArenaOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-xs font-black uppercase tracking-wider hover:bg-indigo-500/20 transition-all flex items-center gap-1.5 shadow-sm"
                  title="Open full interactive courtroom arena view"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Open Debate Arena</span>
                </button>

                <span className={`border px-3 py-1.5 rounded-lg text-sm font-black uppercase tracking-wider ${
                  debate.verdict === "Buy"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : debate.verdict === "Sell"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-500"
                }`}>
                  Judge: {debate.verdict === "Neutral" ? "Neutral (Hold)" : debate.verdict}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-steel">
                <span className="font-mono-data font-bold uppercase">
                  Conviction {Math.round(debate.confidence * 100)}%
                </span>
                <span>·</span>
                <span>{debate.mode === "llm" ? "CrewAI Debate" : "Deterministic Fallback"}</span>
                <span>·</span>
                <span>Committee: {debate.source_recommendation} ({Math.round(debate.source_confidence * 100)}%)</span>
              </div>
            </div>
          </div>

          {/* Advocate Columns (Brief by default, expandable) */}
          <div className="grid gap-4 lg:grid-cols-2">
            
            {/* Bullish Agent Pod */}
            <article className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 border-b border-emerald-500/15 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🐂</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Bullish Agent
                  </h4>
                </div>
                <span className="text-[10px] font-mono-data font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Conviction {Math.round(debate.bull_case.confidence * 100)}%
                </span>
              </div>

              {/* Debate Core Argument */}
              <div className="bg-paper/40 border border-emerald-500/20 p-3 rounded-lg">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                  Core Argument
                </span>
                <p className="text-[12px] leading-relaxed text-ink font-medium">
                  "{debate.bull_case.thesis}"
                </p>
              </div>

              {/* Supporting Arguments (Top 2 in brief, full list on click) */}
              {debate.bull_case.key_arguments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Supporting Arguments ({debate.bull_case.key_arguments.length})
                    </p>
                    {debate.bull_case.key_arguments.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setShowAllBullArgs(!showAllBullArgs)}
                        className="text-[10px] text-mint font-bold hover:underline flex items-center gap-0.5"
                      >
                        {showAllBullArgs ? "Show less" : `Show all (${debate.bull_case.key_arguments.length})`}
                        {showAllBullArgs ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {(showAllBullArgs
                      ? debate.bull_case.key_arguments
                      : debate.bull_case.key_arguments.slice(0, 2)
                    ).map((rawArg, idx) => {
                      const item = parseArgumentEntry(rawArg);
                      return (
                        <div
                          key={idx}
                          className="bg-paper/50 border border-line/60 rounded-lg p-2.5 text-xs space-y-1"
                        >
                          <p className="font-semibold text-ink leading-snug">
                            {item.headline}
                          </p>
                          {item.evidence && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded leading-relaxed">
                              <strong>Evidence:</strong> {item.evidence}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Risks Acknowledged (Collapsible) */}
              {debate.bull_case.counterarguments.length > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowBullRisks(!showBullRisks)}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[11px] font-bold text-amber-500 hover:bg-amber-500/10 transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Risks Acknowledged ({debate.bull_case.counterarguments.length})
                    </span>
                    {showBullRisks ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {showBullRisks && (
                    <ul className="mt-2 space-y-1.5 pl-1 animate-fade-in">
                      {debate.bull_case.counterarguments.map((raw, idx) => {
                        const item = parseArgumentEntry(raw);
                        return (
                          <li key={idx} className="text-[11px] text-steel leading-relaxed bg-paper/30 p-2 rounded border border-line">
                            • {item.headline}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </article>

            {/* Bearish Agent Pod */}
            <article className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 border-b border-rose-500/15 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🐻</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Bearish Agent
                  </h4>
                </div>
                <span className="text-[10px] font-mono-data font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Conviction {Math.round(debate.bear_case.confidence * 100)}%
                </span>
              </div>

              {/* Debate Core Argument */}
              <div className="bg-paper/40 border border-rose-500/20 p-3 rounded-lg">
                <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                  Core Argument
                </span>
                <p className="text-[12px] leading-relaxed text-ink font-medium">
                  "{debate.bear_case.thesis}"
                </p>
              </div>

              {/* Downside Arguments (Top 2 in brief, full list on click) */}
              {debate.bear_case.key_arguments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Downside Arguments ({debate.bear_case.key_arguments.length})
                    </p>
                    {debate.bear_case.key_arguments.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setShowAllBearArgs(!showAllBearArgs)}
                        className="text-[10px] text-rose-500 font-bold hover:underline flex items-center gap-0.5"
                      >
                        {showAllBearArgs ? "Show less" : `Show all (${debate.bear_case.key_arguments.length})`}
                        {showAllBearArgs ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {(showAllBearArgs
                      ? debate.bear_case.key_arguments
                      : debate.bear_case.key_arguments.slice(0, 2)
                    ).map((rawArg, idx) => {
                      const item = parseArgumentEntry(rawArg);
                      return (
                        <div
                          key={idx}
                          className="bg-paper/50 border border-line/60 rounded-lg p-2.5 text-xs space-y-1"
                        >
                          <p className="font-semibold text-ink leading-snug">
                            {item.headline}
                          </p>
                          {item.evidence && (
                            <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-1 rounded leading-relaxed">
                              <strong>Downside Data:</strong> {item.evidence}
                            </p>
                          )}
                          {item.counter && (
                            <p className="text-[11px] text-amber-500 bg-amber-500/10 px-2 py-1 rounded leading-relaxed">
                              <strong>Critical Flaw:</strong> {item.counter}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bull Case Considered (Collapsible) */}
              {debate.bear_case.counterarguments.length > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowBearPoints(!showBearPoints)}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg border border-line bg-paper/30 text-[11px] font-bold text-steel hover:text-ink transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Bull Case Considered ({debate.bear_case.counterarguments.length})
                    </span>
                    {showBearPoints ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {showBearPoints && (
                    <ul className="mt-2 space-y-1.5 pl-1 animate-fade-in">
                      {debate.bear_case.counterarguments.map((raw, idx) => {
                        const item = parseArgumentEntry(raw);
                        return (
                          <li key={idx} className="text-[11px] text-steel leading-relaxed bg-paper/30 p-2 rounded border border-line">
                            • {item.headline}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </article>
          </div>

          {/* Judge Agent Section (Brief by default, expandable details) */}
          <div className="rounded-xl border border-line bg-paper/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-indigo-500" />
                <span>Judge Agent · Why this verdict?</span>
              </h4>

              <button
                type="button"
                onClick={() => setShowDetailedJudge(!showDetailedJudge)}
                className="text-[11px] font-bold text-mint hover:underline flex items-center gap-1"
              >
                <span>{showDetailedJudge ? "Brief View" : "Show Full Deliberation"}</span>
                {showDetailedJudge ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {/* Brief View (Primary 1-2 points) */}
            <div className="bg-paper/40 border border-line/60 p-3 rounded-lg">
              <p className="text-xs text-ink font-medium leading-relaxed">
                {debate.judge_reasoning[0] || debate.summary}
              </p>
            </div>

            {/* Detailed View on Click */}
            {showDetailedJudge && (
              <div className="space-y-4 pt-2 border-t border-line/50 animate-fade-in">
                {debate.judge_reasoning.length > 1 && (
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-steel block mb-1.5">
                      Full Legal Deliberation Points
                    </span>
                    <ul className="space-y-2 list-disc pl-4">
                      {debate.judge_reasoning.slice(1).map((item, idx) => (
                        <li key={idx} className="text-xs text-steel leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {debate.debate_rounds.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                        Bullish Cross-Examination
                      </p>
                      <p className="text-xs text-steel leading-relaxed">
                        {debate.debate_rounds[0].bullish_response}
                      </p>
                    </div>
                    <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                        Bearish Cross-Examination
                      </p>
                      <p className="text-xs text-steel leading-relaxed">
                        {debate.debate_rounds[0].bearish_response}
                      </p>
                    </div>
                  </div>
                )}

                {debate.evidence_gaps.length > 0 && (
                  <div className="pt-2 border-t border-line/70">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Evidence Gaps / Uncertainties
                    </p>
                    <ul className="space-y-1 list-disc pl-4">
                      {debate.evidence_gaps.map((item, idx) => (
                        <li key={idx} className="text-xs text-steel leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-[10px] text-steel/70 leading-relaxed">
            {debate.disclaimer}
          </p>
        </div>
      )}

      {/* Row 2: Thesis & Action Items (Displayed Below Chart Row) */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        
        {/* Thesis Card (Compact with Brief vs Deep-dive toggle) */}
        <div className="rounded-2xl glass-panel p-6 card-hover relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-mint/10 text-mint border border-mint/15">
                  <Target className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
                  Investment Thesis
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsThesisExpanded(!isThesisExpanded)}
                className="text-[11px] font-bold text-mint hover:underline flex items-center gap-1 px-2.5 py-1 rounded-lg border border-mint/20 bg-mint/5 transition-all"
              >
                <span>{isThesisExpanded ? "Brief Mode" : `Show All (${analysis.thesis.length} Pillars)`}</span>
                {isThesisExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {/* Thesis Pillars */}
            <div className="space-y-3">
              {(isThesisExpanded ? analysis.thesis : analysis.thesis.slice(0, 3)).map((item, idx) => {
                const pillarData = parseThesisPillar(item, idx);
                const isSingleExpanded = isThesisExpanded || expandedThesisIdx === idx;

                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-line/70 bg-paper/40 p-3.5 space-y-1.5 transition-all animate-slide-in-left"
                    style={{ animationDelay: `${(idx + 1) * 0.05}s` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono-data font-bold uppercase tracking-wider text-mint flex items-center gap-1 bg-mint/5 px-2 py-0.5 rounded border border-mint/15">
                        <span>{pillarData.pillar.icon}</span>
                        <span>{pillarData.pillar.label}</span>
                      </span>

                      {!isThesisExpanded && (
                        <button
                          type="button"
                          onClick={() => setExpandedThesisIdx(expandedThesisIdx === idx ? null : idx)}
                          className="text-[10px] text-steel hover:text-ink font-semibold flex items-center gap-0.5"
                        >
                          {isSingleExpanded ? "Brief" : "Detail"}
                          {isSingleExpanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                        </button>
                      )}
                    </div>

                    <p className="text-[13px] font-bold text-ink leading-snug">
                      {formatCurrencySymbols(pillarData.headline, symbol, analysis.currency)}
                    </p>

                    {isSingleExpanded && pillarData.deepDive && (
                      <p className="text-xs text-steel leading-relaxed pt-1 border-t border-line/40 animate-fade-in">
                        {formatCurrencySymbols(pillarData.deepDive, symbol, analysis.currency)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {!isThesisExpanded && analysis.thesis.length > 3 && (
              <button
                type="button"
                onClick={() => setIsThesisExpanded(true)}
                className="mt-3 w-full py-2 text-center text-xs font-bold text-steel hover:text-mint transition-colors border border-dashed border-line rounded-xl bg-paper/10"
              >
                + {analysis.thesis.length - 3} More Strategic Pillars (Click to expand)
              </button>
            )}
          </div>
        </div>

        {/* Actions Card (Ranked by Importance with Step Numbers & Priority Labels) */}
        <div className="rounded-2xl glass-panel p-6 card-hover relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber/10 text-amber border border-amber/15">
                  <ListOrdered className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
                    Next Action Items
                  </h3>
                  <span className="text-[10px] text-steel">Ranked by Priority & Urgency</span>
                </div>
              </div>
              <span className="text-[10px] font-mono-data font-bold uppercase text-amber px-2 py-0.5 rounded border border-amber/20 bg-amber/5">
                Step-by-Step
              </span>
            </div>

            {/* Stepper Timeline List */}
            <div className="space-y-3 relative">
              {rankAndFormatActions(analysis.action_items, rec).map((action, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-line/70 bg-paper/40 p-3.5 transition-all hover:bg-paper/70 animate-slide-in-left relative"
                  style={{ animationDelay: `${(idx + 1) * 0.05}s` }}
                >
                  {/* Step Number Circle */}
                  <div className="flex flex-col items-center shrink-0">
                    <span className="h-7 w-7 rounded-lg bg-paper border border-line text-ink font-mono-data font-black text-xs flex items-center justify-center shadow-xs">
                      {action.step}
                    </span>
                  </div>

                  {/* Action Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono-data font-bold uppercase px-2 py-0.5 rounded border ${action.badgeClass}`}>
                        {action.priorityLabel}
                      </span>
                      <span className="text-[10px] text-steel font-bold uppercase tracking-wider">
                        {action.title}
                      </span>
                    </div>

                    <p className="text-[12px] text-ink font-medium leading-relaxed pt-0.5">
                      {formatCurrencySymbols(action.body, symbol, analysis.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Specialist Intelligence Matrix */}
      <div className="rounded-2xl glass-panel p-6 border border-line">
        <div className="flex items-center gap-2 mb-5">
          <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/15">
            <Activity className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
            Specialist Intelligence Workbench
          </h3>
        </div>

        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <nav className="flex flex-col gap-1.5 border-r border-line/50 pr-4 md:pr-6">
            {analysis.agents.map((agent, index) => {
              const Icon = agentIcons[agent.agent] || HelpCircle;
              const score = Number(agent.data.score ?? agent.data.fit_score ?? agent.data.risk_score ?? 50);
              const isRisk = agent.agent.toLowerCase().includes("risk");
              
              const statusBg = 
                isRisk 
                  ? (score > 60 ? "bg-berry" : score > 35 ? "bg-amber" : "bg-mint")
                  : (score >= 60 ? "bg-mint" : score <= 40 ? "bg-berry" : "bg-amber");
                  
              const isSelected = index === activeAgentIndex;

              return (
                <button
                  key={agent.agent}
                  onClick={() => setActiveAgentIndex(index)}
                  className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl transition-all border ${
                    isSelected 
                      ? "border-mint/30 bg-mint/5 text-mint font-bold shadow-sm"
                      : "border-transparent text-steel hover:bg-paper/40 hover:text-ink"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate text-xs tracking-wide uppercase font-semibold">
                      {agent.agent.replace("Analysis Agent", "").replace("Specialist", "").trim()}
                    </span>
                  </div>
                  <span className={`h-2 w-2 rounded-full shrink-0 ${statusBg} ${isSelected ? "animate-pulse" : ""}`} />
                </button>
              );
            })}
          </nav>

          <div className="min-w-0 flex flex-col justify-between animate-fade-in">
            <div>
              <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
                <div>
                  <h4 className="text-sm font-black uppercase text-ink tracking-wide">
                    {selectedAgent.agent}
                  </h4>
                  <p className="text-[11px] text-steel font-medium mt-0.5">
                    AI Conviction: <span className="font-mono-data font-bold text-ink">{Math.round(selectedAgent.confidence * 100)}%</span>
                  </p>
                </div>
              </div>

              <p className="text-[13px] text-steel/90 leading-relaxed mt-4 bg-paper/20 p-4 border border-line/40 rounded-2xl">
                {formatCurrencySymbols(selectedAgent.summary, symbol, analysis.currency)}
              </p>

              {selectedAgent.signals.length > 0 && (
                <div className="mt-5 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-steel block">
                    Telemetry Signals Checklist
                  </span>
                  <ul className="grid gap-2">
                    {selectedAgent.signals.map((signal, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-steel leading-relaxed">
                        <span className="p-0.5 rounded bg-mint/10 text-mint border border-mint/20 mt-0.5 shrink-0">
                          <CheckCircle className="h-3 w-3" />
                        </span>
                        <span className="break-words">
                          {renderTextWithLinks(formatCurrencySymbols(signal, symbol, analysis.currency))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-line">
              <span className="text-[10px] font-black uppercase tracking-wider text-steel block mb-2">
                Key Performance Indicators (KPIs)
              </span>
              {renderAgentTelemetry(selectedAgent)}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Scanned Catalyst Feeds (Displayed Below Workbench Row) */}
      <div className="rounded-2xl glass-panel p-6 border border-line card-hover">
        <div className="flex items-center gap-2 mb-4">
          <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/15">
            <Newspaper className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink font-sans">Scanned Catalyst Feeds</h3>
        </div>
        {analysis.news && analysis.news.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {analysis.news.slice(0, 4).map((item, idx) => (
              <a
                key={`${item.title}-${idx}`}
                href={item.url && !item.url.includes("news.google.com") ? item.url : "#"}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl bg-paper/30 border border-line p-4 hover:bg-paper/70 hover:border-mint transition-all duration-200"
              >
                <div className="flex justify-between items-center gap-2 mb-1.5">
                  <span className="font-mono-data text-[10px] font-black uppercase text-mint tracking-wider bg-mint/5 px-2 py-0.5 rounded border border-mint/10 shrink-0">
                    {(item.source || "").replace(/tavily/gi, "").trim() || "News"}
                  </span>
                  {item.published_at && (
                    <span className="font-mono-data text-[10px] text-steel/50">
                      {item.published_at.split("T")[0] || item.published_at}
                    </span>
                  )}
                </div>
                <h4 className="text-[13px] font-bold text-ink leading-snug hover:text-mint transition-colors line-clamp-2">
                  {formatCurrencySymbols(item.title, symbol, analysis.currency)}
                </h4>
                {item.summary && (
                  <p className="mt-2 line-clamp-2 text-[12px] text-steel/70 leading-relaxed">
                    {formatCurrencySymbols(item.summary, symbol, analysis.currency)}
                  </p>
                )}
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-line rounded-xl bg-paper/10 text-xs text-steel">
            No recent news catalysts found for this stock.
          </div>
        )}
      </div>

      {/* Full Screen Dedicated Debate Chamber Modal (Rendered at root to avoid stacking context traps) */}
      {debate && (
        <DebateArenaModal
          isOpen={isDebateArenaOpen}
          onClose={() => setIsDebateArenaOpen(false)}
          debate={debate}
          symbol={symbol}
          companyName={displayName}
        />
      )}
    </section>
  );
}
