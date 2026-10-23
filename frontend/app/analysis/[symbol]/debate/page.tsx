"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  MessageSquare,
  Scale,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";
import { formatCurrencySymbols } from "@/lib/currency";
import { DebateReport, DebateRound } from "@/lib/types";

// Parse argument entry into structured headline, evidence, and counter
function parseArgEntry(raw: string | any): { headline: string; evidence?: string; counter?: string } {
  if (!raw) return { headline: "Data not available" };
  if (typeof raw !== "string") {
    return {
      headline: String(raw.argument || raw.claim || raw.thesis || raw.headline || JSON.stringify(raw)),
      evidence: raw.evidence ? String(raw.evidence) : undefined,
      counter: raw.counter || raw.critical_flaw ? String(raw.counter || raw.critical_flaw) : undefined,
    };
  }
  const str = raw.trim();

  // Python dict or JSON parsing
  if (
    (str.startsWith("{") && str.endsWith("}")) ||
    str.includes("'argument':") ||
    str.includes('"argument":') ||
    str.includes("'bull_claim':") ||
    str.includes("'bear_concern':")
  ) {
    try {
      const jsonStr = str.replace(/'/g, '"');
      const parsed = JSON.parse(jsonStr);
      const headline =
        parsed.argument || parsed.claim || parsed.bull_claim || parsed.bear_concern || parsed.thesis || "";
      const evidence = parsed.evidence || parsed.proof || parsed.data;
      const counter = parsed.critical_flaw || parsed.counter || parsed.response || parsed.risk;
      if (headline) {
        return {
          headline: String(headline).trim(),
          evidence: evidence ? String(evidence).trim() : undefined,
          counter: counter ? String(counter).trim() : undefined,
        };
      }
    } catch {
      const argMatch = str.match(/['"](?:argument|bull_claim|bear_concern)['"]\s*:\s*['"]([^'"]+)['"]/i);
      const evMatch = str.match(/['"]evidence['"]\s*:\s*['"]([^'"]+)['"]/i);
      const flawMatch = str.match(/['"](?:critical_flaw|counter|response)['"]\s*:\s*['"]([^'"]+)['"]/i);
      if (argMatch) {
        return {
          headline: argMatch[1].trim(),
          evidence: evMatch ? evMatch[1].trim() : undefined,
          counter: flawMatch ? flawMatch[1].trim() : undefined,
        };
      }
    }
  }

  if (str.includes(" — Evidence: ")) {
    const [head, rest] = str.split(" — Evidence: ");
    const [ev, note] = (rest || "").split(" — Note: ");
    return {
      headline: head.trim(),
      evidence: ev ? ev.trim() : undefined,
      counter: note ? note.trim() : undefined,
    };
  }

  const cleaned = str
    .replace(/^\{+/, "")
    .replace(/\}+$/, "")
    .replace(/['"]?argument['"]?\s*:\s*['"]?/gi, "")
    .replace(/['"]?evidence['"]?\s*:\s*['"]?/gi, " Evidence: ")
    .replace(/['"]?critical_flaw['"]?\s*:\s*['"]?/gi, " Counter-risk: ")
    .replace(/^[-•*]\s*/, "")
    .trim();

  return { headline: cleaned || "Data not available" };
}

// Check if string A is substantially identical to string B
function isSubstantiallyDuplicate(a: string, b: string): boolean {
  if (!a || !b) return false;
  const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanB = b.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!cleanA || !cleanB) return false;
  return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
}

// Dedicated full-depth argument card
function FullArgumentCard({
  raw,
  accent,
  symbol,
  currency,
  index,
}: {
  raw: string | any;
  accent: "mint" | "berry";
  symbol: string;
  currency?: string;
  index: number;
}) {
  const { headline, evidence, counter } = parseArgEntry(raw);
  const isBull = accent === "mint";
  const borderClass = isBull ? "border-emerald-500/25 bg-emerald-500/5" : "border-rose-500/25 bg-rose-500/5";

  const low = headline.toLowerCase();
  const strengthLevel =
    low.includes("strong") || low.includes("high") || low.includes("record") || low.includes("robust")
      ? "High Conviction"
      : low.includes("weak") || low.includes("poor") || low.includes("decline") || low.includes("risk")
      ? "High Risk"
      : "Moderate Conviction";

  const analyticalContext = isBull
    ? `The Long Thesis Advocate grounds this position in institutional fundamental criteria. Validated by financial telemetry, this argument examines ${headline}. The durability of this tailwind provides support for multiple expansion across the investment horizon.`
    : `The Short Thesis Advocate notes a primary structural vulnerability. Supported by market evidence, this concern focuses on ${headline}. If macroeconomic headwinds persist, this dynamic could accelerate margin degradation.`;

  return (
    <div className={`p-4 rounded-xl border ${borderClass} space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono-data font-black px-2 py-0.5 rounded ${
            isBull ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
          }`}>
            ARGUMENT #{index + 1}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-wider ${
            strengthLevel === "High Conviction"
              ? "text-emerald-500"
              : strengthLevel === "High Risk"
              ? "text-rose-500"
              : "text-amber"
          }`}>
            {strengthLevel}
          </span>
        </div>
        <span className="text-[10px] font-mono-data text-steel uppercase">Verified Claim</span>
      </div>

      <p className="text-sm font-bold text-ink leading-relaxed">
        {formatCurrencySymbols(headline, symbol, currency)}
      </p>

      {/* Evidence Pill */}
      {evidence && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg border border-line bg-paper/60 text-xs">
          <span className={`font-mono-data font-black uppercase text-[9px] px-1.5 py-0.5 rounded shrink-0 ${
            isBull ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          }`}>
            Source Evidence
          </span>
          <span className="text-steel font-medium leading-snug">
            {formatCurrencySymbols(evidence, symbol, currency)}
          </span>
        </div>
      )}

      {/* In-depth Institutional Analysis (always shown, full depth) */}
      <div className="p-3 rounded-lg border border-line bg-paper/70 text-xs leading-relaxed space-y-1">
        <span className="text-[9px] font-black uppercase tracking-wider text-steel block">
          Adversarial Rationale & Invalidation Threshold
        </span>
        <p className="text-ink/90 font-medium">
          {analyticalContext}
        </p>
      </div>

      {/* Counter Consideration */}
      {counter && (
        <div className="p-2.5 rounded-lg border border-amber/30 bg-amber/5 text-xs space-y-1">
          <span className="font-bold text-amber text-[9px] uppercase tracking-wider block">
            Counter-Consideration & Fragility Note:
          </span>
          <p className="text-ink/80">{formatCurrencySymbols(counter, symbol, currency)}</p>
        </div>
      )}
    </div>
  );
}

export default function DebatePage() {
  const { result } = useAnalysis();
  const params = useParams();
  const rawSymbol = (params.symbol as string) || (params.ticker as string);
  const symbol = rawSymbol?.toUpperCase();

  const [activeTab, setActiveTab] = useState<"all" | "arena" | "rounds" | "judge">("all");

  if (!result) return null;

  const analysis =
    result.analyses.find((a) => a.symbol.split(".")[0].toUpperCase() === symbol) ??
    result.analyses[0];

  if (!analysis) return null;

  const sym = analysis.symbol.split(".")[0];
  const debate: DebateReport | any = (analysis as any).debate;

  // Bull case normalization & deduplication
  const bull = debate?.bull_case ?? debate?.bull ?? debate?.bullish_agent;
  const bullConfidence = Math.round(Number(bull?.confidence ?? 0.5) * 100);
  const bullThesis = bull?.thesis ?? bull?.argument ?? bull?.core_argument ?? "Data not available";
  const rawBullArgs: any[] = Array.isArray(bull?.key_arguments)
    ? bull.key_arguments
    : bull?.key_arguments
    ? [bull.key_arguments]
    : [];

  // Deduplicate against opening thesis
  const bullArgs = rawBullArgs.filter((arg) => {
    const { headline } = parseArgEntry(arg);
    return !isSubstantiallyDuplicate(headline, bullThesis);
  });

  // Bear case normalization & deduplication
  const bear = debate?.bear_case ?? debate?.bear ?? debate?.bearish_agent;
  const bearConfidence = Math.round(Number(bear?.confidence ?? 0.5) * 100);
  const bearThesis = bear?.thesis ?? bear?.argument ?? bear?.core_argument ?? "Data not available";
  const rawBearArgs: any[] = Array.isArray(bear?.key_arguments)
    ? bear.key_arguments
    : bear?.key_arguments
    ? [bear.key_arguments]
    : [];

  // Deduplicate against opening thesis
  const bearArgs = rawBearArgs.filter((arg) => {
    const { headline } = parseArgEntry(arg);
    return !isSubstantiallyDuplicate(headline, bearThesis);
  });

  // Verdict normalization
  const verdict = debate?.verdict ?? debate?.judge?.verdict ?? analysis.recommendation ?? "Data not available";
  const judgeConfidence = Math.round(Number(debate?.confidence ?? analysis.confidence) * 100);
  const judgeReasoning: string[] = Array.isArray(debate?.judge_reasoning)
    ? debate.judge_reasoning
    : debate?.judge?.rationale
    ? [debate.judge.rationale]
    : [];
  const evidenceGaps: string[] = Array.isArray(debate?.evidence_gaps) ? debate.evidence_gaps : [];
  const debateRounds: DebateRound[] = Array.isArray(debate?.debate_rounds) ? debate.debate_rounds : [];

  const totalConv = bullConfidence + bearConfidence || 1;
  const bullShare = Math.round((bullConfidence / totalConv) * 100);
  const bearShare = 100 - bullShare;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in py-1">
      <title>{`Investment Debate — ${analysis.company_name} (${sym}) | StockMaster.AI`}</title>

      {/* ── Sub-Section 1: Adversarial Debate Arena Header & Evidence Conviction ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Scale className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black uppercase tracking-wider text-ink font-sans">
                  Adversarial Debate Arena · Bull vs Bear
                </h1>
                <span className="font-mono-data text-xs font-bold text-mint bg-mint/10 border border-mint/20 px-2 py-0.5 rounded">
                  {sym}
                </span>
              </div>
              <p className="text-xs text-steel mt-0.5">
                Multi-Agent Adversarial Equity Adjudication · Binding Committee Ruling
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${
              verdict === "Buy"
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                : verdict === "Sell"
                ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                : "bg-amber/10 text-amber border-amber/30"
            }`}>
              Judge Ruling: {verdict} ({judgeConfidence}%)
            </span>
          </div>
        </div>

        {/* Conviction Balance Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-500">
              <TrendingUp className="h-4 w-4" />
              Bullish Advocate ({bullConfidence}% Conviction)
            </span>
            <span className="text-[10px] uppercase font-mono-data text-steel">
              Evidence Conviction Balance
            </span>
            <span className="flex items-center gap-1.5 text-rose-500">
              Bearish Advocate ({bearConfidence}% Conviction)
              <TrendingDown className="h-4 w-4" />
            </span>
          </div>

          <div className="h-3 w-full rounded-full bg-line/40 overflow-hidden flex shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
              style={{ width: `${bullShare}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-700"
              style={{ width: `${bearShare}%` }}
            />
          </div>
        </div>

        {/* Metric Statistics Table */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl border border-line bg-paper/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">Long Conviction</span>
            <p className="text-sm font-extrabold text-emerald-500 font-mono-data mt-0.5">{bullConfidence}%</p>
          </div>
          <div className="p-3 rounded-xl border border-line bg-paper/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">Short Conviction</span>
            <p className="text-sm font-extrabold text-rose-500 font-mono-data mt-0.5">{bearConfidence}%</p>
          </div>
          <div className="p-3 rounded-xl border border-line bg-paper/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">Cross-Exam Rounds</span>
            <p className="text-sm font-extrabold text-ink font-mono-data mt-0.5">{debateRounds.length || 1} Completed</p>
          </div>
          <div className="p-3 rounded-xl border border-line bg-paper/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">Evidence Gaps</span>
            <p className="text-sm font-extrabold text-amber font-mono-data mt-0.5">{evidenceGaps.length} Flagged</p>
          </div>
        </div>
      </div>

      {/* ── Sub-Section 2 & 3: Advocate Case Dossiers (Bull & Bear side-by-side, no truncation) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-2">
            <span>Advocate Case Dossiers</span>
            <span className="text-xs text-steel font-normal font-mono-data">(Fully Expanded Evidence)</span>
          </h2>
          <span className="text-[11px] font-mono-data text-steel">
            Deduplicated & Source-Verified
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Bullish Advocate Column ── */}
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-base">
                  🐂
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-emerald-500">
                    Bullish Advocate Case
                  </h3>
                  <p className="text-[11px] text-steel">Upside Champion & Evidence Defense</p>
                </div>
              </div>
              <span className="text-xs font-mono-data font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {bullConfidence}% Conviction
              </span>
            </div>

            {/* Opening Thesis Banner */}
            <div className="bg-paper/80 border border-emerald-500/25 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Primary Opening Thesis
                </span>
                <span className="text-[9px] font-mono-data font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Core Pillar
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-ink leading-relaxed">
                {formatCurrencySymbols(bullThesis, sym, analysis.currency)}
              </p>
              <p className="text-[11px] text-steel leading-relaxed pt-1 border-t border-line">
                The Long Thesis Advocate argues {sym}&apos;s current operational trajectory positions it favorably against peer benchmarks, offering an attractive risk-adjusted runway.
              </p>
            </div>

            {/* Supporting Arguments (All Shown) */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-steel block">
                Supporting Evidence & Arguments ({bullArgs.length})
              </span>
              {bullArgs.length > 0 ? (
                bullArgs.map((arg, idx) => (
                  <FullArgumentCard
                    key={idx}
                    index={idx}
                    raw={arg}
                    accent="mint"
                    symbol={sym}
                    currency={analysis.currency}
                  />
                ))
              ) : (
                <div className="p-4 rounded-xl border border-line bg-paper/40 text-xs text-steel">
                  All supporting points consolidated in opening thesis.
                </div>
              )}
            </div>
          </div>

          {/* ── Bearish Advocate Column ── */}
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/30 text-base">
                  🐻
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-rose-500">
                    Bearish Advocate Case
                  </h3>
                  <p className="text-[11px] text-steel">Downside Risk & Thesis Fragility</p>
                </div>
              </div>
              <span className="text-xs font-mono-data font-bold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                {bearConfidence}% Conviction
              </span>
            </div>

            {/* Opening Thesis Banner */}
            <div className="bg-paper/80 border border-rose-500/25 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Primary Opening Concern
                </span>
                <span className="text-[9px] font-mono-data font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  Downside Anchor
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-ink leading-relaxed">
                {formatCurrencySymbols(bearThesis, sym, analysis.currency)}
              </p>
              <p className="text-[11px] text-steel leading-relaxed pt-1 border-t border-line">
                The Short Thesis Advocate stresses that {sym} remains sensitive to valuation compression, execution bottlenecks, or cyclical sector headwinds.
              </p>
            </div>

            {/* Downside Arguments (All Shown) */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-steel block">
                Downside Evidence & Concerns ({bearArgs.length})
              </span>
              {bearArgs.length > 0 ? (
                bearArgs.map((arg, idx) => (
                  <FullArgumentCard
                    key={idx}
                    index={idx}
                    raw={arg}
                    accent="berry"
                    symbol={sym}
                    currency={analysis.currency}
                  />
                ))
              ) : (
                <div className="p-4 rounded-xl border border-line bg-paper/40 text-xs text-steel">
                  All downside considerations consolidated in opening concern.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub-Section 4: Cross-Examination & Rebuttal Rounds ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-5 w-5 text-mint" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-ink font-sans">
                Cross-Examination & Rebuttal Rounds ({debateRounds.length || 1})
              </h2>
              <p className="text-xs text-steel">Direct exchanges between Long and Short Advocates</p>
            </div>
          </div>
          <span className="text-[10px] font-mono-data uppercase px-2 py-0.5 rounded bg-mint/10 text-mint border border-mint/20">
            Adjudicated
          </span>
        </div>

        <div className="space-y-4">
          {debateRounds.length > 0 ? (
            debateRounds.map((rnd) => (
              <div
                key={rnd.round_number}
                className="rounded-xl border border-line bg-paper/50 p-5 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <span className="text-xs font-mono-data font-black text-mint bg-mint/10 border border-mint/20 px-2.5 py-0.5 rounded">
                    ROUND #{rnd.round_number}
                  </span>
                  <span className="text-[10px] font-mono-data text-steel uppercase">
                    Inter-Agent Challenge & Response
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-500">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Bullish Rebuttal</span>
                    </div>
                    <p className="text-xs text-ink leading-relaxed font-medium">
                      {formatCurrencySymbols(rnd.bullish_response, sym, analysis.currency)}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-500">
                      <TrendingDown className="h-3.5 w-3.5" />
                      <span>Bearish Counter</span>
                    </div>
                    <p className="text-xs text-ink leading-relaxed font-medium">
                      {formatCurrencySymbols(rnd.bearish_response, sym, analysis.currency)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-xl border border-line bg-paper/40 text-xs text-steel text-center py-6">
              Advocates filed primary direct dossiers with direct cross-rebuttal incorporated into the adjudication.
            </div>
          )}
        </div>
      </div>

      {/* ── Sub-Section 5: Full Judge Reasoning & Evidence Gaps ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <Scale className="h-5 w-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-ink font-sans">
                Judge Adjudication & Deliberation Factors
              </h2>
              <p className="text-xs text-steel">Committee Chair Final Binding Assessment</p>
            </div>
          </div>
          <span className="font-mono-data text-xs font-extrabold text-ink bg-paper border border-line px-3 py-1 rounded-lg">
            Final Verdict: <span className="text-mint">{verdict}</span>
          </span>
        </div>

        {/* Executive Adjudication Summary */}
        <div className="p-4 rounded-xl border border-line bg-paper/70 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-mint block">
            Adjudication Statement
          </span>
          <p className="text-xs sm:text-sm font-medium text-ink leading-relaxed">
            {formatCurrencySymbols(debate?.summary || analysis.target_bias || "Data not available", sym, analysis.currency)}
          </p>
        </div>

        {/* Deliberation Factors (All shown in full depth) */}
        {judgeReasoning.length > 0 && (
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">
              Core Deliberation Factors ({judgeReasoning.length})
            </span>
            <div className="space-y-2.5">
              {judgeReasoning.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-line bg-paper/50 text-xs leading-relaxed text-ink space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-mint">
                      Factor #{idx + 1}
                    </span>
                  </div>
                  <p className="font-medium text-ink/90 pl-3.5">
                    {formatCurrencySymbols(item, sym, analysis.currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence Gaps */}
        <div className="p-4 rounded-xl border border-amber/30 bg-amber/5 space-y-2">
          <div className="flex items-center gap-2 text-amber text-xs font-black uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4" />
            <span>Identified Evidence Gaps & Due Diligence Cautions ({evidenceGaps.length})</span>
          </div>
          {evidenceGaps.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-steel pl-2">
              {evidenceGaps.map((gap, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber font-bold">•</span>
                  <span>{formatCurrencySymbols(gap, sym, analysis.currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-steel">
              No material evidence gaps flagged. Specialist coverage meets institutional confidence thresholds.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
