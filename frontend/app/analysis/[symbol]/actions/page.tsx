"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckSquare, ListOrdered, Square } from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";
import { AppShell } from "@/components/AppShell";
import { sequenceActionItems } from "@/lib/actionItems";
import { formatCurrencySymbols } from "@/lib/currency";

export default function ActionsPage() {
  const { result } = useAnalysis();
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string)?.toUpperCase();
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());

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

  const actions = sequenceActionItems(analysis.action_items, analysis.recommendation);

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
                  Complete in order
                </span>
              </div>
              <p className="text-xs text-steel mt-0.5">
                {analysis.company_name} · {sym} · {actions.length} steps to follow
              </p>
            </div>
          </div>

          <div className="text-xs font-mono-data font-bold text-mint bg-mint/10 border border-mint/20 px-3 py-1.5 rounded-lg">
            {completedSteps.size} / {actions.length} Completed
          </div>
        </div>

        {/* Action checklist */}
        <div className="space-y-3.5">
          {actions.map((action) => {
            const isDone = completedSteps.has(action.step);
            const isLongDescription = action.description.length > 260;
            const isExpanded = expandedDescriptions.has(action.step);
            const visibleDescription = isLongDescription && !isExpanded
              ? `${action.description.slice(0, 240).trimEnd()}…`
              : action.description;
            return (
              <div
                key={action.sourceIndex}
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
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className={`text-sm font-black tracking-wide ${isDone ? "line-through text-steel" : "text-ink"}`}>
                        Action {action.step} - {action.title}
                      </h3>

                      {/* Interactive checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleStep(action.step)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
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

                    <div className="text-xs text-steel leading-relaxed bg-paper/40 p-3 rounded-xl border border-line/60">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-steel/70 mb-1">
                        Description
                      </span>
                      {formatCurrencySymbols(visibleDescription, sym, analysis.currency)}
                      {isLongDescription && (
                        <button
                          type="button"
                          onClick={() => setExpandedDescriptions((current) => {
                            const next = new Set(current);
                            if (next.has(action.step)) next.delete(action.step);
                            else next.add(action.step);
                            return next;
                          })}
                          className="mt-2 block text-xs font-semibold text-mint hover:underline"
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? "Show less" : "Read full description"}
                        </button>
                      )}
                    </div>
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
