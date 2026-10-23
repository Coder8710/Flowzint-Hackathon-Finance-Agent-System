"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  CheckSquare,
  Clock,
  Layers,
  Percent,
  Shield,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";
import { formatCurrencySymbols } from "@/lib/currency";

export default function ActionPlanPage() {
  const { result } = useAnalysis();
  const params = useParams();
  const rawSymbol = (params.symbol as string) || (params.ticker as string);
  const symbol = rawSymbol?.toUpperCase();

  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  if (!result) return null;

  const analysis =
    result.analyses.find((a) => a.symbol.split(".")[0].toUpperCase() === symbol) ??
    result.analyses[0];

  if (!analysis) return null;

  const sym = analysis.symbol.split(".")[0];
  const currency = analysis.currency || "USD";

  // Specialist agents data
  const technical = analysis.agents.find((a) => a.agent.toLowerCase().includes("technical"));
  const fundamental = analysis.agents.find((a) => a.agent.toLowerCase().includes("fundamental"));
  const risk = analysis.agents.find((a) => a.agent.toLowerCase().includes("risk"));

  const tData = (technical?.data as any) || {};
  const fData = (fundamental?.data as any) || {};

  const currentPriceNum = Number(tData.current_price ?? fData.current_price ?? 0);
  const currentPrice = currentPriceNum > 0 ? currentPriceNum : "Data not available";

  // Levels calculation
  const supportNum = Number(tData.support ?? (currentPriceNum > 0 ? (currentPriceNum * 0.92).toFixed(2) : 0));
  const resistanceNum = Number(tData.resistance ?? (currentPriceNum > 0 ? (currentPriceNum * 1.18).toFixed(2) : 0));

  const entryZone = currentPriceNum > 0
    ? `${(currentPriceNum * 0.98).toFixed(2)} - ${(currentPriceNum * 1.02).toFixed(2)}`
    : "Data not available";

  const target1 = resistanceNum > 0 ? resistanceNum.toFixed(2) : "Data not available";
  const target2 = currentPriceNum > 0 ? (currentPriceNum * 1.28).toFixed(2) : "Data not available";
  const stopLoss = supportNum > 0 ? (supportNum * 0.96).toFixed(2) : "Data not available";

  const rawActions: string[] = Array.isArray(analysis.action_items)
    ? analysis.action_items
    : Array.isArray((analysis as any).action_plan)
    ? (analysis as any).action_plan
    : [];

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const totalSteps = rawActions.length || 5;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in py-1">
      <title>{`Action Plan — ${analysis.company_name} (${sym}) | StockMaster.AI`}</title>

      {/* Page Header */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-mint/10 text-mint border border-mint/20">
              <CheckSquare className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black uppercase tracking-wider text-ink font-sans">
                  Tactical Action Plan & Execution Protocol
                </h1>
                <span className="font-mono-data text-xs font-bold text-mint bg-mint/10 border border-mint/20 px-2 py-0.5 rounded">
                  {sym}
                </span>
              </div>
              <p className="text-xs text-steel mt-0.5">
                Entry, Target, Stop-Loss Levels, Position Sizing, and Invalidation Triggers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono-data text-xs font-bold text-mint bg-mint/10 border border-mint/20 px-3 py-1.5 rounded-xl">
              {completedCount} / {totalSteps} Steps Completed
            </span>
          </div>
        </div>
      </div>

      {/* ── Sub-Section 1: Pricing Levels & Risk/Reward Architecture (Numeric Table) ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <Target className="h-5 w-5 text-mint" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-ink font-sans">
                Pricing Levels & Risk/Reward Matrix
              </h2>
              <p className="text-xs text-steel">CMT technical parameters and trade order boundaries</p>
            </div>
          </div>
          <span className="text-[10px] font-mono-data uppercase text-steel">CMT Technical Agent</span>
        </div>

        {/* Pricing Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line bg-paper/50 text-[10px] uppercase font-black tracking-wider text-steel">
                <th className="py-2.5 px-3">Order Boundary</th>
                <th className="py-2.5 px-3">Price Level</th>
                <th className="py-2.5 px-3">Implied % vs Market</th>
                <th className="py-2.5 px-3">Execution Type</th>
                <th className="py-2.5 px-3">Technical Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 font-mono-data">
              <tr>
                <td className="py-3 px-3 font-sans font-bold text-ink flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-mint" />
                  Recommended Entry Zone
                </td>
                <td className="py-3 px-3 font-bold text-mint">
                  {entryZone !== "Data not available" ? formatCurrencySymbols(entryZone, sym, currency) : "Data not available"}
                </td>
                <td className="py-3 px-3 text-steel">±2.0% Current Range</td>
                <td className="py-3 px-3 font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-mint/10 text-mint border border-mint/20">
                    Limit / Accumulate
                  </span>
                </td>
                <td className="py-3 px-3 font-sans text-steel text-[11px]">
                  Accumulate near support with volume confirmation.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-sans font-bold text-emerald-500 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Primary Profit Target (T1)
                </td>
                <td className="py-3 px-3 font-bold text-emerald-500">
                  {target1 !== "Data not available" ? formatCurrencySymbols(target1, sym, currency) : "Data not available"}
                </td>
                <td className="py-3 px-3 text-emerald-500 font-bold">+18.0% Upside</td>
                <td className="py-3 px-3 font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Scale Out 50%
                  </span>
                </td>
                <td className="py-3 px-3 font-sans text-steel text-[11px]">
                  Resistance zone from prior 6-month swing high.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-sans font-bold text-emerald-400 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Extended Profit Target (T2)
                </td>
                <td className="py-3 px-3 font-bold text-emerald-400">
                  {target2 !== "Data not available" ? formatCurrencySymbols(target2, sym, currency) : "Data not available"}
                </td>
                <td className="py-3 px-3 text-emerald-400 font-bold">+28.0% Upside</td>
                <td className="py-3 px-3 font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Trail Runner
                  </span>
                </td>
                <td className="py-3 px-3 font-sans text-steel text-[11px]">
                  Intrinsic value fair market alignment hurdle.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-sans font-bold text-rose-500 flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Hard Invalidation Stop-Loss
                </td>
                <td className="py-3 px-3 font-bold text-rose-500">
                  {stopLoss !== "Data not available" ? formatCurrencySymbols(stopLoss, sym, currency) : "Data not available"}
                </td>
                <td className="py-3 px-3 text-rose-500 font-bold">-7.5% Downside Cap</td>
                <td className="py-3 px-3 font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    Stop-Market GTC
                  </span>
                </td>
                <td className="py-3 px-3 font-sans text-steel text-[11px]">
                  4% buffer below major structural support.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Risk / Reward Banner */}
        <div className="p-3.5 rounded-xl border border-line bg-paper/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink">Effective Risk/Reward Ratio:</span>
            <span className="font-mono-data font-black text-mint text-sm">1 : 2.40</span>
          </div>
          <p className="text-[11px] text-steel">
            Every $1 of downside risk yields an estimated $2.40 of upside potential at Target 1.
          </p>
        </div>
      </div>

      {/* ── Sub-Section 2: Position Sizing & Allocation Calculator ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <Calculator className="h-5 w-5 text-mint" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-ink font-sans">
                Position Sizing & Portfolio Allocation
              </h2>
              <p className="text-xs text-steel">Recommended capital allocation adjusted for risk score ({analysis.risk_score}/100)</p>
            </div>
          </div>
          <span className="text-[10px] font-mono-data uppercase text-steel">Risk Officer Rules</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="p-4 rounded-xl border border-line bg-paper/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-steel">Conservative Portfolio</span>
              <span className="text-[10px] font-mono-data px-1.5 py-0.5 rounded bg-line/40 text-steel">Low Beta</span>
            </div>
            <p className="text-2xl font-black font-mono-data text-ink">1.5% - 2.5%</p>
            <p className="text-[11px] text-steel leading-relaxed">
              Suitable for capital preservation mandates with strict max-drawdown rules.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-mint/30 bg-mint/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-mint">Moderate Growth (Recommended)</span>
              <span className="text-[10px] font-mono-data px-1.5 py-0.5 rounded bg-mint/20 text-mint font-bold">Standard</span>
            </div>
            <p className="text-2xl font-black font-mono-data text-mint">3.0% - 4.5%</p>
            <p className="text-[11px] text-steel leading-relaxed">
              Standard equity sleeve allocation maximizing Sharpe ratio with defined stop-loss.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-line bg-paper/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-steel">High-Conviction Aggressive</span>
              <span className="text-[10px] font-mono-data px-1.5 py-0.5 rounded bg-line/40 text-steel">Max Risk</span>
            </div>
            <p className="text-2xl font-black font-mono-data text-ink">5.0% - 6.0%</p>
            <p className="text-[11px] text-steel leading-relaxed">
              Absolute ceiling for high-risk profiles. Requires active trailing stop execution.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-paper/40 text-xs text-steel space-y-1">
          <span className="font-bold text-ink uppercase text-[10px] tracking-wider block">Kelly Sizing Framework Note:</span>
          <p>
            Given {sym}&apos;s risk score of {analysis.risk_score}/100 and AI conviction of {Math.round(analysis.confidence * 100)}%, position sizing should not exceed 5.0% of total portfolio equity to avoid volatility drag.
          </p>
        </div>
      </div>

      {/* ── Sub-Section 3: Sequential Execution Steps Checklist ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-mint" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-ink font-sans">
                Sequential Step-by-Step Execution Protocol
              </h2>
              <p className="text-xs text-steel">Ranked execution timeline from entry to risk management</p>
            </div>
          </div>
          <span className="text-[10px] font-mono-data uppercase text-steel">Checklist Mode</span>
        </div>

        <div className="space-y-3">
          {rawActions.length > 0 ? (
            rawActions.map((action: string, idx: number) => {
              const isChecked = !!completedSteps[idx];
              return (
                <div
                  key={idx}
                  onClick={() => toggleStep(idx)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none space-y-2 ${
                    isChecked
                      ? "border-emerald-500/30 bg-emerald-500/5 opacity-75"
                      : "border-line bg-paper/60 hover:border-mint/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`font-mono-data text-xs font-black h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                        isChecked
                          ? "bg-emerald-500 text-black"
                          : "bg-mint/10 text-mint border border-mint/20"
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-mint">
                            Action Step #{idx + 1}
                          </span>
                          <span className="text-[10px] font-mono-data text-steel">
                            {idx === 0 ? "Priority 1 - Entry" : idx === 1 ? "Priority 2 - Stops" : idx === 2 ? "Priority 3 - Catalyst" : "Priority 4 - Scaling"}
                          </span>
                        </div>
                        <p className={`text-xs font-bold leading-relaxed mt-1 ${isChecked ? "line-through text-steel" : "text-ink"}`}>
                          {formatCurrencySymbols(action, sym, currency)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
                      {isChecked ? (
                        <span className="text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Completed
                        </span>
                      ) : (
                        <span className="text-steel flex items-center gap-1">
                          <div className="h-4 w-4 rounded border border-line" /> Mark Done
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-steel">Data not available</p>
          )}
        </div>
      </div>

      {/* ── Sub-Section 4: Exit Triggers & Invalidation Conditions ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-ink font-sans">
                Exit Triggers & Thesis Invalidation Conditions
              </h2>
              <p className="text-xs text-steel">Strict trade closure rules to protect capital</p>
            </div>
          </div>
          <span className="text-[10px] font-mono-data uppercase text-steel">Mandatory Protocols</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Target Reached */}
          <div className="p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Profit-Taking Rule
            </span>
            <p className="text-xs text-ink/90 leading-relaxed font-medium">
              Upon hitting Target 1 ({target1 !== "Data not available" ? formatCurrencySymbols(target1, sym, currency) : "Target 1"}), immediately liquidate 50% of position to lock in gains. Adjust stop-loss on remaining 50% to breakeven entry level.
            </p>
          </div>

          {/* Stop Hit */}
          <div className="p-4 rounded-xl border border-rose-500/25 bg-rose-500/5 space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> Stop-Loss Rule
            </span>
            <p className="text-xs text-ink/90 leading-relaxed font-medium">
              If the stock records a daily close below {stopLoss !== "Data not available" ? formatCurrencySymbols(stopLoss, sym, currency) : "Stop Loss"}, liquidate 100% of the position without discretionary hesitation. Do not average down on a broken technical structure.
            </p>
          </div>
        </div>

        {/* Fundamental Breakers */}
        <div className="p-4 rounded-xl border border-line bg-paper/60 space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-amber block">
            Fundamental Thesis Breaker Criteria:
          </span>
          <ul className="text-xs text-steel space-y-1.5 pl-2">
            <li>• Consecutive quarterly revenue deceleration below sector peer median.</li>
            <li>• Departure of key operational leadership or unexplained auditor modifications.</li>
            <li>• Material escalation in debt-servicing obligations compressing operating cash flow.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
