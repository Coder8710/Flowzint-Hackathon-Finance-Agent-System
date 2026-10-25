"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  ExternalLink,
  FileText,
  Maximize2,
  Newspaper,
  Scale,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";
import { AppShell } from "@/components/AppShell";
import { MetricBar } from "@/components/MetricBar";
import { TrendSparkline } from "@/components/TrendSparkline";
import { sequenceActionItems } from "@/lib/actionItems";
import { formatCurrencySymbols } from "@/lib/currency";
import { CompanyAnalysis, AgentFinding } from "@/lib/types";

// Recommendation badge matching original styling
function RecommendationBadge({ rec }: { rec: string }) {
  const styles =
    rec === "Buy"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
      : rec === "Sell"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
      : "border-amber/40 bg-amber/10 text-amber";

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${styles}`}>
      {rec === "Buy" ? <TrendingUp className="h-3.5 w-3.5" /> : rec === "Sell" ? <TrendingDown className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
      {rec}
    </span>
  );
}

// Agent status chip with dot
function AgentChip({ agent, symbol, currency }: { agent: AgentFinding; symbol: string; currency?: string }) {
  const score = Number(agent.data.score ?? agent.data.fit_score ?? agent.data.risk_score ?? 50);
  const isRisk = agent.agent.toLowerCase().includes("risk");
  const good = isRisk ? score <= 40 : score >= 60;
  const bad  = isRisk ? score > 65  : score < 40;
  const dotColor = good ? "bg-emerald-500" : bad ? "bg-rose-500" : "bg-amber";
  const label = agent.agent.replace(" Agent", "").replace(" Specialist", "");

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-paper/50">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <span className="text-xs font-bold text-ink">{label}</span>
      </div>
      <span className="text-xs font-mono-data font-bold text-steel">
        {Math.round(agent.confidence * 100)}%
      </span>
    </div>
  );
}

export default function OverviewPage() {
  const { result } = useAnalysis();
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string)?.toUpperCase();

  useEffect(() => {
    if (!result) router.replace("/");
  }, [result, router]);

  if (!result) return null;

  const analysis: CompanyAnalysis | undefined =
    result.analyses.find((a) => a.symbol.split(".")[0].toUpperCase() === symbol) ??
    result.analyses[0];

  if (!analysis) {
    router.replace("/");
    return null;
  }

  const sym = analysis.symbol.split(".")[0];
  const base = `/analysis/${sym}`;
  const actions = sequenceActionItems(analysis.action_items, analysis.recommendation);
  const technical = analysis.agents.find((a) => a.agent.includes("Technical"));
  const debate = (analysis as any).debate;

  // Debate conviction values
  const bullCase = debate?.bull_case ?? debate?.bull;
  const bearCase = debate?.bear_case ?? debate?.bear;
  const bullConf = Math.round(Number(bullCase?.confidence ?? 0.5) * 100);
  const bearConf = Math.round(Number(bearCase?.confidence ?? 0.5) * 100);
  const judgeRuling = debate?.verdict ?? debate?.judge?.verdict ?? analysis.recommendation;

  const totalConv = bullConf + bearConf || 1;
  const bullPct = Math.round((bullConf / totalConv) * 100);
  const bearPct = 100 - bullPct;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up py-2">
        <title>{`${analysis.company_name} (${sym}) — Overview | Stockmaster.ai`}</title>

        {/* ── 1. Research Summary Banner ── */}
        <div className="border border-line bg-paper p-6 rounded-2xl relative overflow-hidden group shadow-panel">
          <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 w-64 h-64 rounded-full bg-gradient-to-bl from-mint/10 to-transparent blur-3xl pointer-events-none" />
          <p className="text-[10px] font-black uppercase tracking-widest text-mint bg-mint/5 px-2.5 py-0.5 rounded border border-mint/10 inline-block">
            Stockmaster.ai Research Verdict
          </p>
          <h2 className="mt-3 text-lg font-bold tracking-tight text-ink leading-relaxed">
            {formatCurrencySymbols(result.summary, sym, analysis.currency)}
          </h2>
          <p className="mt-4 text-[11px] font-medium text-steel/60 leading-relaxed border-t border-line pt-3">
            Disclaimer: {result.disclaimer}
          </p>
        </div>

        {/* ── 2. Target Asset Hero Card ── */}
        <div className="rounded-2xl glass-panel p-6 border border-line shadow-panel">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-center">
            {/* Left side: identity + progress bars */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono-data text-xs font-bold text-mint bg-mint/10 border border-mint/20 px-2.5 py-1 rounded-lg">
                  {sym}
                </span>
                <RecommendationBadge rec={analysis.recommendation} />
                <span className="text-xs text-steel">
                  {analysis.company_name}
                </span>
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-ink">
                  {analysis.company_name}
                </h1>
                <p className="text-xs font-medium text-steel mt-1 leading-relaxed">
                  {formatCurrencySymbols(analysis.target_bias, sym, analysis.currency)}
                </p>
              </div>

              {/* Progress bars matching original design */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <MetricBar
                  label="AI Conviction Score"
                  value={analysis.confidence * 100}
                  tone="good"
                />
                <MetricBar
                  label="Risk Score"
                  value={analysis.risk_score}
                  tone={analysis.risk_score > 65 ? "bad" : analysis.risk_score > 40 ? "warn" : "good"}
                />
              </div>
            </div>

            {/* Right side: Sparkline card */}
            <div className="border border-line bg-paper/60 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-steel">
                  Historical Trend
                </span>
                <span className="text-xs font-bold text-mint font-mono-data">
                  ▲ {formatCurrencySymbols(String((technical?.data as any)?.current_price ?? "—"), sym, analysis.currency)}
                </span>
              </div>
              <TrendSparkline
                symbol={sym}
                history={technical?.data.history}
                currency={analysis.currency}
                historyIsSimulated={technical?.data.history_is_simulated === true}
              />
            </div>
          </div>
        </div>

        {/* ── 3. Executive Preview: Investment Debate ── */}
        <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5">
          {debate ? (
            <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <Scale className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-ink">
                  Adversarial Debate Arena · Bull vs Bear
                </h2>
                <p className="text-[11px] text-steel">
                  Conviction {Math.round(analysis.confidence * 100)}% · Multi-Agent Debate · Committee Ruling
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                judgeRuling === "Buy"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : judgeRuling === "Sell"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                  : "border-amber/40 bg-amber/10 text-amber"
              }`}>
                Judge: {judgeRuling}
              </span>
              <Link
                href={`${base}/debate`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-paper/60 text-xs font-bold text-ink hover:border-mint hover:text-mint transition-all shadow-sm"
              >
                <Maximize2 className="h-3.5 w-3.5 text-mint" />
                <span>View Full Debate</span>
              </Link>
            </div>
          </div>

          {/* Battle Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="flex items-center gap-1.5 text-emerald-500">
                <TrendingUp className="h-3.5 w-3.5" />
                Bullish Advocate ({bullConf}%)
              </span>
              <span className="text-[10px] uppercase font-mono-data text-steel">
                Evidence Conviction Balance
              </span>
              <span className="flex items-center gap-1.5 text-rose-500">
                Bearish Advocate ({bearConf}%)
                <TrendingDown className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-line/30 overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                style={{ width: `${bullPct}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-500"
                style={{ width: `${bearPct}%` }}
              />
            </div>
          </div>

          {/* Side-by-side advocate pods */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Bull Pod */}
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🐂</span>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-500">
                    Bullish Agent
                  </span>
                </div>
                <span className="text-[11px] font-mono-data font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Conviction {bullConf}%
                </span>
              </div>
              <p className="text-xs font-medium text-ink leading-relaxed line-clamp-3">
                {bullCase?.thesis || "Constructive upside fundamentals backed by secular category tailwinds."}
              </p>
            </div>

            {/* Bear Pod */}
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🐻</span>
                  <span className="text-xs font-black uppercase tracking-wider text-rose-500">
                    Bearish Agent
                  </span>
                </div>
                <span className="text-[11px] font-mono-data font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Conviction {bearConf}%
                </span>
              </div>
              <p className="text-xs font-medium text-ink leading-relaxed line-clamp-3">
                {bearCase?.thesis || "Downside risks include valuation multiple compression and regulatory scrutiny."}
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Link
              href={`${base}/debate`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-mint hover:underline"
            >
              <span>Explore the Bull and Bear Debate</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-ink">Bull and Bear Debate</h2>
                <p className="mt-1 text-xs text-steel">
                  Generate the evidence-based debate when you are ready to review both sides.
                </p>
              </div>
              <Link
                href={`${base}/debate`}
                className="inline-flex items-center gap-2 rounded-lg border border-mint/30 bg-mint/10 px-3 py-2 text-xs font-bold text-mint hover:bg-mint/15"
              >
                <Scale className="h-4 w-4" />
                Open debate
              </Link>
            </div>
          )}
        </div>

        {/* ── 4. Grid: Investment Thesis & Action Plan ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Investment Thesis Preview */}
          <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 flex flex-col">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-mint" />
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                  Investment Thesis
                </h3>
              </div>
              <Link
                href={`${base}/thesis`}
                className="text-xs font-bold text-mint hover:underline"
              >
                View All ({analysis.thesis.length} Pillars)
              </Link>
            </div>

            <div className="space-y-3 flex-1">
              {analysis.thesis.slice(0, 3).map((item, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-line bg-paper/40 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {i === 0 ? "💎" : i === 1 ? "🚀" : "📊"}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-mint">
                      Pillar {i + 1}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-ink leading-relaxed line-clamp-2">
                    {formatCurrencySymbols(item, sym, analysis.currency)}
                  </p>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-line mt-4">
              <Link
                href={`${base}/thesis`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-mint hover:underline"
              >
                <span>Read Full 6-Pillar Deep Dive</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Action Plan Preview */}
          <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 flex flex-col">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-mint" />
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                  Next Action Items
                </h3>
              </div>
              <Link
                href={`${base}/actions`}
                className="text-xs font-bold text-mint hover:underline"
              >
                Step-by-Step ({analysis.action_items.length})
              </Link>
            </div>

            <div className="space-y-3 flex-1">
              {actions.slice(0, 3).map((action) => (
                <div key={action.sourceIndex} className="p-3.5 rounded-xl border border-line bg-paper/40 space-y-1.5">
                  <p className="text-xs font-bold text-ink line-clamp-1">
                    Action {action.step} - {action.title}
                  </p>
                  <p className="text-xs text-steel leading-relaxed line-clamp-2">
                    {formatCurrencySymbols(action.description, sym, analysis.currency)}
                  </p>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-line mt-4">
              <Link
                href={`${base}/actions`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-mint hover:underline"
              >
                <span>View all recommended steps</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── 5. Grid: Analyst Reports & News Feeds ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Analyst Reports Preview */}
          <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 flex flex-col">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-mint" />
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                  Analyst Reports
                </h3>
              </div>
              <Link
                href={`${base}/reports`}
                className="text-xs font-bold text-mint hover:underline"
              >
                Workbench (6 Agents)
              </Link>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 flex-1">
              {analysis.agents.map((agent) => (
                <AgentChip
                  key={agent.agent}
                  agent={agent}
                  symbol={sym}
                  currency={analysis.currency}
                />
              ))}
            </div>

            <div className="pt-4 border-t border-line mt-4">
              <Link
                href={`${base}/reports`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-mint hover:underline"
              >
                <span>Open Specialist Intelligence Workbench</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* News & Catalysts Preview */}
          <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 flex flex-col">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-mint" />
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                  Scanned Catalyst Feeds
                </h3>
              </div>
              <Link
                href={`${base}/news`}
                className="text-xs font-bold text-mint hover:underline"
              >
                All Feeds ({analysis.news?.length || 0})
              </Link>
            </div>

            <div className="space-y-3 flex-1">
              {analysis.news && analysis.news.length > 0 ? (
                analysis.news.slice(0, 3).map((item, i) => (
                  <div key={i} className="p-3 rounded-xl border border-line bg-paper/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono-data font-bold text-mint">
                        {item.source}
                      </span>
                      {item.published_at && (
                        <span className="text-[10px] text-steel/60 font-mono-data">
                          {item.published_at.split("T")[0]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-ink leading-snug line-clamp-1">
                      {formatCurrencySymbols(item.title, sym, analysis.currency)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-steel">No recent news feeds scanned.</p>
              )}
            </div>

            <div className="pt-4 border-t border-line mt-4">
              <Link
                href={`${base}/news`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-mint hover:underline"
              >
                <span>Read All Catalysts & Market Impact</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
