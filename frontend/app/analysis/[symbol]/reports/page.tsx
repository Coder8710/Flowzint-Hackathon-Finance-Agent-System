"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Brain,
  Briefcase,
  CheckCircle2,
  FileText,
  HelpCircle,
  Newspaper,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";
import { AppShell } from "@/components/AppShell";
import { MetricBar } from "@/components/MetricBar";
import { formatCurrencySymbols } from "@/lib/currency";
import { AgentFinding } from "@/lib/types";

const agentTabs = [
  { key: "fundamental", label: "Fundamental", icon: BarChart3, match: "Fundamental" },
  { key: "technical",   label: "Technical",   icon: TrendingUp, match: "Technical" },
  { key: "news",        label: "News & Macro",icon: Newspaper,  match: "News" },
  { key: "sentiment",   label: "Sentiment",   icon: Brain,      match: "Sentiment" },
  { key: "risk",        label: "Risk",        icon: ShieldCheck,match: "Risk" },
  { key: "portfolio",   label: "Portfolio",   icon: Briefcase,  match: "Portfolio" },
];

function AgentKPIs({ agent, symbol, currency }: { agent: AgentFinding; symbol: string; currency?: string }) {
  const data = agent.data || {};
  const name = agent.agent;

  if (name.includes("Fundamental")) {
    const metrics = (data.key_metrics as Record<string, unknown>) || {};
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Moat Quality", value: String(data.moat_rating ?? "Wide") },
          { label: "Intrinsic Value", value: formatCurrencySymbols(String(data.intrinsic_value_estimate ?? "—"), symbol, currency) },
          { label: "P/E Ratio", value: String(metrics.pe_ratio ?? data.pe_ratio ?? "—") },
          { label: "Debt to Equity", value: String(metrics.debt_to_equity ?? data.debt_to_equity ?? "—") },
        ].map((item) => (
          <div key={item.label} className="p-3.5 rounded-xl border border-line bg-paper/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-steel block mb-1">
              {item.label}
            </span>
            <span className="text-sm font-black font-mono-data text-ink">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (name.includes("Technical")) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Trend Direction", value: String(data.trend_direction ?? "Uptrend") },
          { label: "Signal", value: String(data.signal ?? "Wait") },
          { label: "14-Period RSI", value: String(data.rsi_reading ?? "—") },
          { label: "Key Resistance", value: formatCurrencySymbols(String(data.key_resistance ?? "—"), symbol, currency) },
        ].map((item) => (
          <div key={item.label} className="p-3.5 rounded-xl border border-line bg-paper/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-steel block mb-1">
              {item.label}
            </span>
            <span className="text-sm font-black font-mono-data text-ink">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (name.includes("News")) {
    const sources = Array.isArray(data.sources) ? data.sources.join(", ") : String(data.sources ?? "Yahoo RSS, Global Web");
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Macro Impact", value: String(data.impact_direction ?? "Constructive") },
          { label: "Catalyst Category", value: String(data.catalyst_type ?? "Earnings / Guidance") },
          { label: "Coverage Sources", value: sources },
        ].map((item) => (
          <div key={item.label} className="p-3.5 rounded-xl border border-line bg-paper/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-steel block mb-1">
              {item.label}
            </span>
            <span className="text-xs font-bold text-ink truncate block">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (name.includes("Sentiment")) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Fear & Greed Proxy", value: String(data.fear_greed_proxy ?? "Greed") },
          { label: "Social Buzz Volume", value: String(data.social_buzz_volume ?? "High") },
          { label: "Positioning Bias", value: String(data.positioning_bias ?? "Bullish Skew") },
        ].map((item) => (
          <div key={item.label} className="p-3.5 rounded-xl border border-line bg-paper/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-steel block mb-1">
              {item.label}
            </span>
            <span className="text-xs font-bold text-ink truncate block">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (name.includes("Risk")) {
    const rScore = Number(data.risk_score ?? 50);
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="p-3.5 rounded-xl border border-line bg-paper/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-steel block mb-1">
            Downside Volatility Score
          </span>
          <span className={`text-base font-black font-mono-data ${rScore > 65 ? "text-rose-500" : "text-mint"}`}>
            {rScore} / 100
          </span>
        </div>
        <div className="p-3.5 rounded-xl border border-line bg-paper/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-steel block mb-1">
            Assessed Risk Regime
          </span>
          <span className={`text-base font-bold ${rScore > 65 ? "text-rose-500" : "text-mint"}`}>
            {rScore > 65 ? "High Drawdown Risk" : rScore > 40 ? "Moderate Volatility" : "Defensive"}
          </span>
        </div>
      </div>
    );
  }

  if (name.includes("Portfolio")) {
    return (
      <div className="p-4 rounded-xl border border-line bg-paper/50 space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-steel block">
          Portfolio Allocation Strategy
        </span>
        <p className="text-xs text-mint font-medium leading-relaxed">
          {formatCurrencySymbols(String(data.allocation_advice ?? "Standard tranche sizing recommended."), symbol, currency)}
        </p>
      </div>
    );
  }

  return null;
}

export default function ReportsPage() {
  const { result } = useAnalysis();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const symbol = (params.symbol as string)?.toUpperCase();

  useEffect(() => {
    if (!result) router.replace("/");
  }, [result, router]);

  if (!result) return null;

  const analysis =
    result.analyses.find((a) => a.symbol.split(".")[0].toUpperCase() === symbol) ??
    result.analyses[0];

  if (!analysis) {
    router.replace("/");
    return null;
  }

  const sym = analysis.symbol.split(".")[0];
  const base = `/analysis/${sym}`;

  // Tab selection
  const initialAgent = searchParams.get("agent") || "";
  const initialIndex = agentTabs.findIndex((t) => t.key === initialAgent);
  const [activeTab, setActiveTab] = useState(initialIndex >= 0 ? initialIndex : 0);

  const currentTab = agentTabs[activeTab];
  const activeAgent = analysis.agents.find((a) => a.agent.includes(currentTab.match));

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up py-2">
        <title>{`Analyst Reports — ${analysis.company_name} (${sym}) | Stockmaster.ai`}</title>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-steel">
          <Link href={base} className="text-mint hover:underline">
            Overview ({sym})
          </Link>
          <span>/</span>
          <span className="text-ink">Specialist Intelligence Workbench</span>
        </div>

        {/* Header */}
        <div className="rounded-2xl glass-panel p-6 border border-line shadow-panel flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-mint/10 text-mint border border-mint/20">
              <FileText className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-base font-black uppercase tracking-wider text-ink">
                Specialist Intelligence Workbench
              </h1>
              <p className="text-xs text-steel mt-0.5">
                {analysis.company_name} · {sym} · 6 Specialized AI Committee Members
              </p>
            </div>
          </div>
          <span className="text-xs font-mono-data font-bold text-mint bg-mint/10 border border-mint/20 px-3 py-1 rounded-lg">
            Active Dossier
          </span>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-2 border-b border-line pb-2 overflow-x-auto">
          {agentTabs.map((tab, idx) => {
            const Icon = tab.icon;
            const agentObj = analysis.agents.find((a) => a.agent.includes(tab.match));
            const score = agentObj ? Number(agentObj.data.score ?? agentObj.data.fit_score ?? 50) : 50;
            const isRisk = tab.key === "risk";
            const good = isRisk ? score <= 40 : score >= 60;
            const bad = isRisk ? score > 65 : score < 40;
            const dotColor = good ? "bg-emerald-500" : bad ? "bg-rose-500" : "bg-amber";
            const isActive = idx === activeTab;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all shrink-0 ${
                  isActive
                    ? "border-mint bg-mint/10 text-mint shadow-[0_0_12px_rgba(8,153,129,0.15)]"
                    : "border-line bg-paper/40 text-steel hover:text-ink hover:border-line/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
              </button>
            );
          })}
        </div>

        {/* Active Agent Dossier Card */}
        {activeAgent ? (
          <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-6 animate-fade-in">
            {/* Dossier Header */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-mint">
                  Specialist Dossier
                </span>
                <h2 className="text-lg font-black tracking-tight text-ink mt-0.5">
                  {activeAgent.agent}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-data font-bold text-mint bg-mint/10 border border-mint/20 px-2.5 py-1 rounded-lg">
                  Conviction {Math.round(activeAgent.confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Metric progress */}
            <MetricBar
              label="Agent Confidence Conviction"
              value={activeAgent.confidence * 100}
              tone="good"
            />

            {/* Specialist Summary */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-steel block">
                Specialist Summary & Core Analysis
              </span>
              <div className="p-4 rounded-xl border border-line bg-paper/50 text-xs font-medium text-ink leading-relaxed">
                {formatCurrencySymbols(activeAgent.summary, sym, analysis.currency)}
              </div>
            </div>

            {/* Key Signals Checklist */}
            {activeAgent.signals && activeAgent.signals.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-steel block">
                  Telemetry Signals Checklist ({activeAgent.signals.length})
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeAgent.signals.map((signal, sIdx) => (
                    <div
                      key={sIdx}
                      className="flex items-start gap-2.5 p-3 rounded-xl border border-line bg-paper/30 text-xs"
                    >
                      <CheckCircle2 className="h-4 w-4 text-mint shrink-0 mt-0.5" />
                      <span className="text-ink leading-snug">
                        {formatCurrencySymbols(signal, sym, analysis.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Performance Indicators */}
            <div className="space-y-2.5 border-t border-line pt-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-steel block">
                Key Performance Indicators (KPIs)
              </span>
              <AgentKPIs agent={activeAgent} symbol={sym} currency={analysis.currency} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-steel text-xs">
            No report data available for this specialist agent.
          </div>
        )}

        {/* Back Link */}
        <div className="pt-2">
          <Link
            href={base}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mint hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Overview ({sym})</span>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
