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
  TrendingDown
} from "lucide-react";
import { CompanyAnalysis, AgentFinding } from "@/lib/types";
import { MetricBar } from "./MetricBar";
import { TrendSparkline } from "./TrendSparkline";
import { formatCurrencySymbols } from "@/lib/currency";

const agentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "News & Macro Specialist": Newspaper,
  "Fundamental Analysis Agent": BarChart3,
  "Technical Analysis Agent": TrendingUp,
  "Sentiment Analysis Agent": Target,
  "Risk Analysis Agent": ShieldCheck,
  "Portfolio Advisor Agent": HelpCircle,
};

export function AnalysisReport({ analysis, overrideCompanyName }: { analysis: CompanyAnalysis; overrideCompanyName?: string }) {
  const [activeAgentIndex, setActiveAgentIndex] = useState<number>(0);
  const technical = analysis.agents.find((agent) => agent.agent === "Technical Analysis Agent");
  
  const symbol = analysis.symbol;
  const rec = analysis.recommendation;
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
            <p className="text-xs font-semibold text-ink mt-0.5 truncate">{sourcesList}</p>
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

      {/* Row 2: Thesis & Action Items (Displayed Below Chart Row) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Thesis Card */}
        <div className="rounded-2xl glass-panel p-6 card-hover relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-1.5 rounded-lg bg-mint/10 text-mint border border-mint/15">
              <Target className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Investment Thesis</h3>
          </div>
          <ul className="space-y-3">
            {analysis.thesis.map((item, idx) => (
              <li 
                key={idx} 
                className="text-[13px] text-steel leading-relaxed border-l-2 border-mint pl-3 animate-slide-in-left"
                style={{ animationDelay: `${(idx + 1) * 0.05}s` }}
              >
                {formatCurrencySymbols(item, symbol, analysis.currency)}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions Card */}
        <div className="rounded-2xl glass-panel p-6 card-hover relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-1.5 rounded-lg bg-amber/10 text-amber border border-amber/15">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Next Action Items</h3>
          </div>
          <ul className="space-y-3">
            {analysis.action_items.map((item, idx) => (
              <li 
                key={idx} 
                className="text-[13px] text-steel leading-relaxed border-l-2 border-amber pl-3 animate-slide-in-left"
                style={{ animationDelay: `${(idx + 1) * 0.05}s` }}
              >
                {formatCurrencySymbols(item, symbol, analysis.currency)}
              </li>
            ))}
          </ul>
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
                          {formatCurrencySymbols(signal, symbol, analysis.currency)}
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
                href={item.url && item.url.startsWith('http') ? item.url : `https://news.google.com/search?q=${encodeURIComponent(item.title + " " + symbol.split(".")[0])}`}
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
    </section>
  );
}
