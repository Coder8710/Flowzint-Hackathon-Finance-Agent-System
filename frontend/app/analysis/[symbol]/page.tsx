"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart2,
  BookOpen,
  CheckSquare,
  FileText,
  Newspaper,
  Scale,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";
import { TrendSparkline } from "@/components/TrendSparkline";
import { formatCurrencySymbols } from "@/lib/currency";
import { CompanyAnalysis, AgentFinding } from "@/lib/types";

function RecommendationBadge({ rec, confidence }: { rec: string; confidence: number }) {
  const styles =
    rec === "Buy"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
      : rec === "Sell"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
      : "border-amber/40 bg-amber/10 text-amber";

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${styles}`}>
      {rec === "Buy" ? <TrendingUp className="h-3.5 w-3.5" /> : rec === "Sell" ? <TrendingDown className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
      {rec} {Math.round(confidence * 100)}%
    </span>
  );
}

export default function OverviewPage() {
  const { result } = useAnalysis();
  const params = useParams();
  const rawSymbol = (params.symbol as string) || (params.ticker as string);
  const symbol = rawSymbol?.toUpperCase();

  if (!result) return null;

  const analysis: CompanyAnalysis | undefined =
    result.analyses.find((a) => a.symbol.split(".")[0].toUpperCase() === symbol) ??
    result.analyses[0];

  if (!analysis) return null;

  const sym = analysis.symbol.split(".")[0];
  const base = `/analysis/${sym}`;
  const currency = analysis.currency || "USD";

  // Specialist agents
  const technical = analysis.agents.find((a) => a.agent.toLowerCase().includes("technical"));
  const fundamental = analysis.agents.find((a) => a.agent.toLowerCase().includes("fundamental"));
  const risk = analysis.agents.find((a) => a.agent.toLowerCase().includes("risk"));

  const currentPrice = (technical?.data as any)?.current_price ?? (fundamental?.data as any)?.current_price ?? "Data not available";
  const peRatio = (fundamental?.data as any)?.pe_ratio ?? (fundamental?.data as any)?.pe ?? "Data not available";
  const intrinsicVal = (fundamental?.data as any)?.intrinsic_value ?? (fundamental?.data as any)?.target_price ?? "Data not available";

  // Debate conviction values
  const debate = (analysis as any).debate;
  const bullCase = debate?.bull_case ?? debate?.bull;
  const bearCase = debate?.bear_case ?? debate?.bear;
  const bullConf = Math.round(Number(bullCase?.confidence ?? 0.5) * 100);
  const bearConf = Math.round(Number(bearCase?.confidence ?? 0.5) * 100);
  const totalConv = bullConf + bearConf || 1;
  const bullPct = Math.round((bullConf / totalConv) * 100);
  const bearPct = 100 - bullPct;

  // Actions preview
  const actionsList: string[] = Array.isArray(analysis.action_items)
    ? analysis.action_items.slice(0, 3)
    : Array.isArray((analysis as any).action_plan)
    ? (analysis as any).action_plan.slice(0, 3)
    : [];

  // News preview
  const newsList: any[] = Array.isArray(analysis.news)
    ? analysis.news.slice(0, 3)
    : Array.isArray((result as any).news)
    ? (result as any).news.slice(0, 3)
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in py-1">
      <title>{`${analysis.company_name} (${sym}) — Overview | StockMaster.AI`}</title>

      {/* ── 1. Target Asset Hero Card ── */}
      <div className="rounded-2xl glass-panel p-6 border border-line shadow-panel">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px] items-center">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono-data text-xs font-bold text-mint bg-mint/10 border border-mint/20 px-2.5 py-0.8 rounded-lg">
                {sym}
              </span>
              <RecommendationBadge rec={analysis.recommendation} confidence={analysis.confidence} />
              <span className="text-xs text-steel font-medium">
                {analysis.company_name}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-ink font-sans">
                {analysis.company_name}
              </h1>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-extrabold text-ink font-mono-data">
                  {currentPrice !== "Data not available"
                    ? formatCurrencySymbols(String(currentPrice), sym, currency)
                    : "Data not available"}
                </span>
                <span className="text-xs text-steel">Last Traded Market Snapshot</span>
              </div>
            </div>

            {/* Compact Bull vs Bear Conviction Bar */}
            <div className="pt-2 max-w-lg space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-500 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Bull {bullConf}%
                </span>
                <span className="text-[10px] uppercase font-mono-data text-steel">
                  Adversarial Conviction
                </span>
                <span className="text-rose-500 flex items-center gap-1">
                  Bear {bearConf}% <TrendingDown className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-line/40 overflow-hidden flex">
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
          </div>

          {/* Sparkline & Target */}
          <div className="border border-line bg-paper/60 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-steel">
              <span className="uppercase tracking-wider">Historical Trend</span>
              <span className="text-mint font-mono-data">30-Day Activity</span>
            </div>
            <TrendSparkline
              symbol={sym}
              history={technical?.data.history}
              currency={currency}
            />
          </div>
        </div>

        {/* ── 2. 3-5 Key Metrics Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-line">
          <div className="p-3 rounded-xl border border-line bg-paper/40">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">P/E Multiple</span>
            <p className="text-sm font-extrabold text-ink font-mono-data mt-0.5">
              {peRatio !== "Data not available" ? `${peRatio}x` : "Data not available"}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-line bg-paper/40">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">Intrinsic Valuation</span>
            <p className="text-sm font-extrabold text-ink font-mono-data mt-0.5">
              {intrinsicVal !== "Data not available"
                ? formatCurrencySymbols(String(intrinsicVal), sym, currency)
                : "Data not available"}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-line bg-paper/40">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">Downside Risk Score</span>
            <p className={`text-sm font-extrabold font-mono-data mt-0.5 ${
              analysis.risk_score > 65 ? "text-rose-500" : analysis.risk_score > 40 ? "text-amber" : "text-emerald-500"
            }`}>
              {analysis.risk_score}/100
            </p>
          </div>
          <div className="p-3 rounded-xl border border-line bg-paper/40">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">Committee Alignment</span>
            <p className="text-sm font-extrabold text-mint font-mono-data mt-0.5">
              {Math.round(analysis.confidence * 100)}% Conviction
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Short Thesis Summary Card ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-3">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-mint" />
            <h3 className="text-sm font-black uppercase tracking-wider text-ink">
              Core Investment Thesis Summary
            </h3>
          </div>
          <span className="text-[10px] font-mono-data uppercase text-steel">Executive Brief</span>
        </div>

        <p className="text-xs sm:text-sm font-medium text-ink leading-relaxed">
          {formatCurrencySymbols(result.summary || analysis.target_bias, sym, currency)}
        </p>

        <div className="pt-2 flex justify-end">
          <Link
            href={`${base}/thesis`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-mint hover:underline group"
          >
            <span>View full details</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* ── 4. Two-Column Grid: Debate Arena Preview & Specialist Reports Preview ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Debate Preview */}
        <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                  Adversarial Debate Arena
                </h3>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Bull vs Bear
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 block">🐂 Bullish Advocate</span>
                <p className="text-ink font-medium line-clamp-2">
                  {bullCase?.thesis || "Constructive upside potential driven by secular market growth and operating leverage."}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 block">🐻 Bearish Advocate</span>
                <p className="text-ink font-medium line-clamp-2">
                  {bearCase?.thesis || "Downside risks center on potential margin contraction and valuation multiple compression."}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-line mt-4 flex justify-end">
            <Link
              href={`${base}/debate`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-mint hover:underline group"
            >
              <span>View full details</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Specialist Reports Preview */}
        <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-mint" />
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                  Specialist Intelligence
                </h3>
              </div>
              <span className="text-[10px] font-mono-data text-steel">6 Specialists</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {analysis.agents.map((ag, idx) => {
                const label = ag.agent.replace(" Agent", "").replace(" Specialist", "");
                const score = Number(ag.data.score ?? ag.data.fit_score ?? ag.data.risk_score ?? 50);
                const isRiskAgent = ag.agent.toLowerCase().includes("risk");
                const good = isRiskAgent ? score <= 40 : score >= 60;
                const dotColor = good ? "bg-emerald-500" : isRiskAgent && score > 65 ? "bg-rose-500" : "bg-amber";

                return (
                  <div key={idx} className="p-2.5 rounded-lg border border-line bg-paper/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
                      <span className="text-[11px] font-bold text-ink truncate">{label}</span>
                    </div>
                    <span className="text-[11px] font-mono-data font-bold text-steel ml-1">
                      {Math.round(ag.confidence * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-line mt-4 flex justify-end">
            <Link
              href={`${base}/reports`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-mint hover:underline group"
            >
              <span>View full details</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── 5. Two-Column Grid: Top 3 Actions & Top 3 News ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top 3 Actions */}
        <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-mint" />
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                  Top Recommended Actions
                </h3>
              </div>
              <span className="text-[10px] font-mono-data uppercase text-steel">Step-by-Step</span>
            </div>

            <div className="space-y-2">
              {actionsList.length > 0 ? (
                actionsList.map((act: string, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl border border-line bg-paper/50 flex items-start gap-3">
                    <span className="font-mono-data text-xs font-black text-mint bg-mint/10 border border-mint/20 h-6 w-6 rounded-md flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-xs font-medium text-ink leading-snug line-clamp-2">
                      {formatCurrencySymbols(act, sym, currency)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-steel">Data not available</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-line mt-4 flex justify-end">
            <Link
              href={`${base}/action-plan`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-mint hover:underline group"
            >
              <span>View full details</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Top 3 News */}
        <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-mint" />
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                  Latest Catalysts & News
                </h3>
              </div>
              <span className="text-[10px] font-mono-data uppercase text-steel">Live Feed</span>
            </div>

            <div className="space-y-2">
              {newsList.length > 0 ? (
                newsList.map((item: any, idx: number) => {
                  const text = (item.title || "").toLowerCase();
                  const isBullish = text.includes("surge") || text.includes("gain") || text.includes("profit") || text.includes("growth");
                  const isBearish = text.includes("drop") || text.includes("fall") || text.includes("loss") || text.includes("risk");
                  const tag = isBullish ? "Bullish" : isBearish ? "Bearish" : "Neutral";
                  const tagColor = isBullish ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : isBearish ? "text-rose-500 bg-rose-500/10 border-rose-500/20" : "text-steel bg-steel/10 border-line";

                  return (
                    <div key={idx} className="p-3 rounded-xl border border-line bg-paper/50 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={`px-1.5 py-0.2 rounded font-black uppercase border ${tagColor}`}>
                          {tag}
                        </span>
                        <span className="text-steel/70 font-mono-data">{item.published || "Recent"}</span>
                      </div>
                      <p className="text-xs font-semibold text-ink line-clamp-1">
                        {item.title}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-steel">Data not available</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-line mt-4 flex justify-end">
            <Link
              href={`${base}/news`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-mint hover:underline group"
            >
              <span>View full details</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
