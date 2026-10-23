"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, CheckSquare, ListOrdered, Square } from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";
import { AppShell } from "@/components/AppShell";
import { formatCurrencySymbols } from "@/lib/currency";

interface RankedAction {
  step: number;
  priorityLabel: string;
  badgeClass: string;
  dotColor: string;
  title: string;
  body: string;
}

function rankAction(raw: string, idx: number, recommendation: string): RankedAction {
  const text = raw.trim();
  const low = text.toLowerCase();
  let label = "Priority · Execution Step";
  let badgeClass = "border-indigo-500/30 bg-indigo-500/10 text-indigo-400";
  let dotColor = "bg-indigo-500";

  if (
    low.includes("immediate") ||
    low.includes("limit buy") ||
    low.includes("entry trigger") ||
    low.includes("gtc limit") ||
    (recommendation === "Buy" && (low.includes("entry") || low.includes("starter position") || low.includes("buy at"))) ||
    (recommendation === "Sell" && (low.includes("exit") || low.includes("sell") || low.includes("liquidate")))
  ) {
    label = "Priority 1 · Immediate Trigger";
    badgeClass = recommendation === "Sell"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";
    dotColor = recommendation === "Sell" ? "bg-rose-500" : "bg-emerald-500";
  } else if (
    low.includes("stop-loss") ||
    low.includes("hard stop") ||
    low.includes("trailing stop") ||
    low.includes("risk protocol") ||
    low.includes("protect capital")
  ) {
    label = "Priority 2 · Risk Protocol & Stop";
    badgeClass = "border-rose-500/30 bg-rose-500/10 text-rose-500";
    dotColor = "bg-rose-500";
  } else if (
    low.includes("profit-taking") ||
    low.includes("take profit") ||
    low.includes("target price") ||
    low.includes("resistance level") ||
    low.includes("tranche")
  ) {
    label = "Priority 3 · Profit Target";
    badgeClass = "border-amber/30 bg-amber/10 text-amber";
    dotColor = "bg-amber";
  } else if (
    low.includes("earnings") ||
    low.includes("review date") ||
    low.includes("catalyst") ||
    low.includes("quarterly")
  ) {
    label = "Priority 4 · Catalyst & Earnings Date";
    badgeClass = "border-indigo-500/30 bg-indigo-500/10 text-indigo-400";
    dotColor = "bg-indigo-500";
  }

  // Parse title & body
  let title = `Action Step ${idx + 1}`;
  let body = text;
  if (text.includes(":") && text.indexOf(":") < 60) {
    const parts = text.split(":");
    title = parts[0].replace(/^Action\s*\d+\s*[-–]?\s*/i, "").trim();
    body = parts.slice(1).join(":").trim();
  }

  return {
    step: idx + 1,
    priorityLabel: label,
    badgeClass,
    dotColor,
    title,
    body,
  };
}

export default function ActionsPage() {
  const { result } = useAnalysis();
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string)?.toUpperCase();
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

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

  const toggleStep = (stepIdx: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.has(stepIdx) ? next.delete(stepIdx) : next.add(stepIdx);
      return next;
    });
  };

  const rankedActions = analysis.action_items.map((item, idx) =>
    rankAction(item, idx, analysis.recommendation)
  );

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up py-2">
        <title>{`Action Plan — ${analysis.company_name} (${sym}) | Stockmaster.ai`}</title>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-steel">
          <Link href={base} className="text-mint hover:underline">
            Overview ({sym})
          </Link>
          <span>/</span>
          <span className="text-ink">Next Action Items</span>
        </div>

        {/* Header */}
        <div className="rounded-2xl glass-panel p-6 border border-line shadow-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-mint/10 text-mint border border-mint/20">
              <ListOrdered className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black uppercase tracking-wider text-ink">
                  Next Action Items · Step-by-Step
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider text-mint bg-mint/10 border border-mint/20 px-2 py-0.5 rounded">
                  Ranked by Priority & Urgency
                </span>
              </div>
              <p className="text-xs text-steel mt-0.5">
                {analysis.company_name} · {sym} · {analysis.action_items.length} Structured Steps
              </p>
            </div>
          </div>

          <div className="text-xs font-mono-data font-bold text-mint bg-mint/10 border border-mint/20 px-3 py-1.5 rounded-lg">
            {completedSteps.size} / {analysis.action_items.length} Completed
          </div>
        </div>

        {/* Action checklist */}
        <div className="space-y-3.5">
          {rankedActions.map((action, idx) => {
            const isDone = completedSteps.has(idx);
            return (
              <div
                key={idx}
                className={`rounded-2xl border p-5 transition-all glass-panel ${
                  isDone
                    ? "border-line bg-paper/20 opacity-60"
                    : "border-line hover:border-mint/30 shadow-panel"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Step number badge */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-paper border border-line text-xs font-black font-mono-data text-ink shadow-sm">
                      {action.step}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${action.badgeClass}`}>
                        {action.priorityLabel}
                      </span>

                      {/* Interactive checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleStep(idx)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          isDone
                            ? "bg-mint/10 border-mint/30 text-mint"
                            : "bg-paper/40 border-line text-steel hover:text-ink hover:border-mint"
                        }`}
                        aria-pressed={isDone}
                      >
                        {isDone ? <CheckSquare className="h-3.5 w-3.5 text-mint" /> : <Square className="h-3.5 w-3.5" />}
                        <span>{isDone ? "Done" : "Mark Complete"}</span>
                      </button>
                    </div>

                    <h3 className={`text-xs font-black uppercase tracking-wider ${isDone ? "line-through text-steel" : "text-ink"}`}>
                      Action Step {action.step}: {action.title}
                    </h3>

                    <p className="text-xs text-steel leading-relaxed bg-paper/40 p-3 rounded-xl border border-line/60">
                      {formatCurrencySymbols(action.body, sym, analysis.currency)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

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
