"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Brain,
  Briefcase,
  CheckCircle2,
  Compass,
  FileText,
  Layers,
  LineChart,
  Newspaper,
  Percent,
  PieChart,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";
import { formatCurrencySymbols } from "@/lib/currency";
import { AgentFinding } from "@/lib/types";

function getAgentMeta(name: string) {
  const low = name.toLowerCase();
  if (low.includes("fundamental")) {
    return {
      title: "Fundamental Analysis Agent",
      role: "Financial Statement Modeling & Intrinsic Valuation",
      icon: BarChart2,
      accent: "emerald",
      badge: "Equity Research",
    };
  }
  if (low.includes("technical")) {
    return {
      title: "CMT Technical Analysis Agent",
      role: "Momentum Indicators, Trendlines & Support/Resistance",
      icon: LineChart,
      accent: "indigo",
      badge: "Chartered Market Tech",
    };
  }
  if (low.includes("news") || low.includes("macro")) {
    return {
      title: "News & Macro Specialist Agent",
      role: "Global Macroeconomic Drivers & Regulatory Headwinds",
      icon: Newspaper,
      accent: "amber",
      badge: "Macro Intelligence",
    };
  }
  if (low.includes("sentiment")) {
    return {
      title: "Sentiment Strategist Agent",
      role: "Market Psychology, Institutional Flows & Retail Bias",
      icon: Brain,
      accent: "purple",
      badge: "Behavioral Finance",
    };
  }
  if (low.includes("risk")) {
    return {
      title: "Chief Risk Officer Agent",
      role: "Tail-Risk Quantification, Max Drawdown & Beta Volatility",
      icon: Shield,
      accent: "rose",
      badge: "Risk Governance",
    };
  }
  return {
    title: "Private Wealth Manager Agent",
    role: "Portfolio Allocation, Sizing & Rebalancing Optimization",
    icon: Briefcase,
    accent: "mint",
    badge: "Portfolio Strategy",
  };
}

export default function ReportsPage() {
  const { result } = useAnalysis();
  const params = useParams();
  const rawSymbol = (params.symbol as string) || (params.ticker as string);
  const symbol = rawSymbol?.toUpperCase();

  const [filterAgent, setFilterAgent] = useState<string>("all");

  if (!result) return null;

  const analysis =
    result.analyses.find((a) => a.symbol.split(".")[0].toUpperCase() === symbol) ??
    result.analyses[0];

  if (!analysis) return null;

  const sym = analysis.symbol.split(".")[0];
  const currency = analysis.currency || "USD";
  const agents = analysis.agents || [];

  const filteredAgents = filterAgent === "all"
    ? agents
    : agents.filter((ag) => ag.agent.toLowerCase().includes(filterAgent.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in py-1">
      <title>{`Analyst Reports — ${analysis.company_name} (${sym}) | StockMaster.AI`}</title>

      {/* Page Header */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-mint/10 text-mint border border-mint/20">
              <FileText className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black uppercase tracking-wider text-ink font-sans">
                  Specialist Intelligence Workbench
                </h1>
                <span className="font-mono-data text-xs font-bold text-mint bg-mint/10 border border-mint/20 px-2 py-0.5 rounded">
                  {sym}
                </span>
              </div>
              <p className="text-xs text-steel mt-0.5">
                Full-depth dossiers from 6 autonomous AI committee specialists
              </p>
            </div>
          </div>

          <span className="text-xs font-mono-data font-bold text-steel bg-paper border border-line px-3 py-1.5 rounded-xl">
            {agents.length} Specialists Reporting
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
          <button
            type="button"
            onClick={() => setFilterAgent("all")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filterAgent === "all"
                ? "bg-mint text-black font-extrabold shadow-sm"
                : "border border-line bg-paper/60 text-steel hover:text-ink"
            }`}
          >
            All Specialists ({agents.length})
          </button>
          {agents.map((ag) => {
            const label = ag.agent.replace(" Agent", "").replace(" Specialist", "");
            const isSelected = filterAgent.toLowerCase() === label.toLowerCase();
            return (
              <button
                key={ag.agent}
                type="button"
                onClick={() => setFilterAgent(label)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-mint text-black font-extrabold shadow-sm"
                    : "border border-line bg-paper/60 text-steel hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sub-Section 1: Comparative Specialist Scorecard (Summary Matrix Table) ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-mint" />
            <h2 className="text-sm font-black uppercase tracking-wider text-ink">
              Specialist Alignment & Scoring Matrix
            </h2>
          </div>
          <span className="text-[10px] font-mono-data uppercase text-steel">Overview Table</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line bg-paper/50 text-[10px] uppercase font-black tracking-wider text-steel">
                <th className="py-2.5 px-3">Specialist Agent</th>
                <th className="py-2.5 px-3">Discipline</th>
                <th className="py-2.5 px-3">Specialist Score</th>
                <th className="py-2.5 px-3">Conviction</th>
                <th className="py-2.5 px-3">Posture Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 font-mono-data">
              {agents.map((ag) => {
                const meta = getAgentMeta(ag.agent);
                const score = Number(ag.data.score ?? ag.data.fit_score ?? ag.data.risk_score ?? 50);
                const isRisk = ag.agent.toLowerCase().includes("risk");
                const good = isRisk ? score <= 40 : score >= 60;
                const bad = isRisk ? score > 65 : score < 40;
                const posture = good ? "Constructive / Bullish" : bad ? "Defensive / Bearish" : "Neutral / Cautious";
                const badgeColor = good ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : bad ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-amber/10 text-amber border-amber/20";

                return (
                  <tr key={ag.agent}>
                    <td className="py-3 px-3 font-sans font-bold text-ink flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${good ? "bg-emerald-500" : bad ? "bg-rose-500" : "bg-amber"}`} />
                      {meta.title}
                    </td>
                    <td className="py-3 px-3 font-sans text-steel text-[11px]">{meta.badge}</td>
                    <td className="py-3 px-3 font-bold text-ink">
                      {score}/100
                    </td>
                    <td className="py-3 px-3 font-bold text-mint">
                      {Math.round(ag.confidence * 100)}%
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor}`}>
                        {posture}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Sub-Sections 2-7: Individual Full In-Depth Agent Sections (No Truncation) ── */}
      <div className="space-y-6">
        {filteredAgents.map((ag, idx) => {
          const meta = getAgentMeta(ag.agent);
          const Icon = meta.icon;
          const score = Number(ag.data.score ?? ag.data.fit_score ?? ag.data.risk_score ?? 50);
          const isRisk = ag.agent.toLowerCase().includes("risk");
          const good = isRisk ? score <= 40 : score >= 60;
          const bad = isRisk ? score > 65 : score < 40;

          const indicators = Object.entries(ag.data || {}).filter(
            ([k]) => !["summary", "explanation", "analysis", "score", "fit_score", "risk_score", "history"].includes(k.toLowerCase())
          );

          const summaryText = String(
            ag.data.summary || ag.data.analysis || ag.data.explanation || "Detailed analysis logged in telemetry."
          );

          return (
            <div
              key={ag.agent}
              id={`agent-${idx}`}
              className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5 animate-fade-in"
            >
              {/* Agent Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <span className={`p-2.5 rounded-xl border ${
                    good
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : bad
                      ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      : "bg-amber/10 text-amber border-amber/20"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black uppercase tracking-wider text-ink font-sans">
                        {meta.title}
                      </h2>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-line/40 text-steel">
                        {meta.badge}
                      </span>
                    </div>
                    <p className="text-xs text-steel mt-0.5">{meta.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto font-mono-data text-xs">
                  <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                    good
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                      : bad
                      ? "bg-rose-500/10 text-rose-500 border-rose-500/25"
                      : "bg-amber/10 text-amber border-amber/25"
                  }`}>
                    Score: {score}/100
                  </span>
                  <span className="px-2.5 py-1 rounded-lg font-bold border border-line bg-paper text-mint">
                    Conviction: {Math.round(ag.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* In-Depth Institutional Analysis */}
              <div className="p-4 rounded-xl border border-line bg-paper/70 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-mint block">
                  Core Analysis & Evaluation Rationale
                </span>
                <p className="text-xs sm:text-sm font-medium text-ink leading-relaxed">
                  {formatCurrencySymbols(summaryText, sym, currency)}
                </p>
              </div>

              {/* Numeric Indicators & Telemetry Signals */}
              {indicators.length > 0 ? (
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-steel block">
                    Telemetry Signals & Indicators Checklist ({indicators.length})
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {indicators.map(([key, val]) => (
                      <div
                        key={key}
                        className="p-3 rounded-xl border border-line bg-paper/50 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-steel capitalize block">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="text-ink font-semibold">
                            {typeof val === "object" ? JSON.stringify(val) : formatCurrencySymbols(String(val), sym, currency)}
                          </span>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-mint shrink-0 mt-0.5" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-line bg-paper/40 text-xs text-steel">
                  Quantitative signals integrated into aggregate scoring.
                </div>
              )}

              {/* Strengths & Weaknesses / Risk Notes */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-line">
                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Specialist Strengths
                  </span>
                  <p className="text-xs text-ink/80 leading-relaxed font-medium">
                    {good
                      ? `Signals indicate high alignment with long criteria. Supported by solid quantitative telemetry in ${meta.title.toLowerCase()}.`
                      : "Maintains localized support buffers; potential for recovery if sector tailwinds strengthen."}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Identified Weaknesses & Risks
                  </span>
                  <p className="text-xs text-ink/80 leading-relaxed font-medium">
                    {bad
                      ? `Critical cautionary signals detected. Elevated risk parameters require defensive position sizing and active stop monitoring.`
                      : "Remains vulnerable to broader macroeconomic yield swings or unexpected volume deceleration."}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
