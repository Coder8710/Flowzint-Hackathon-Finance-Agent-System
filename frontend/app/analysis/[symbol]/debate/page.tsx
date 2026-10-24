"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Scale,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";
import { AppShell } from "@/components/AppShell";
import { formatCurrencySymbols } from "@/lib/currency";
import { DebateReport } from "@/lib/types";

// Parse argument entry
function parseArgEntry(raw: string | any): { headline: string; evidence?: string; counter?: string } {
  if (!raw) return { headline: "" };
  if (typeof raw !== "string") {
    return {
      headline: String(raw.argument || raw.claim || raw.thesis || raw.headline || JSON.stringify(raw)),
      evidence: raw.evidence ? String(raw.evidence) : undefined,
      counter: raw.counter || raw.critical_flaw ? String(raw.counter || raw.critical_flaw) : undefined,
    };
  }
  let str = raw.trim();

  // Python dict or JSON parsing
  if (
    (str.startsWith("{") && str.endsWith("}")) ||
    str.includes("'argument':") ||
    str.includes('"argument":') ||
    str.includes("'bull_claim':") ||
    str.includes("'bear_concern':")
  ) {
    try {
      const jsonStr = str
        .replace(/'/g, '"')
        .replace(/True/g, "true")
        .replace(/False/g, "false")
        .replace(/None/g, "null");
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

  return { headline: cleaned };
}

// Single argument item card with evidence badge and collapsible counter-risk
function ArgumentItem({
  raw,
  accent,
  symbol,
  currency,
}: {
  raw: string | any;
  accent: "mint" | "berry";
  symbol: string;
  currency?: string;
}) {
  const { headline, evidence, counter } = parseArgEntry(raw);
  const [showCounter, setShowCounter] = useState(false);

  const borderClass = accent === "mint" ? "border-emerald-500/20 bg-paper/60" : "border-rose-500/20 bg-paper/60";
  const textClass = accent === "mint" ? "text-emerald-500" : "text-rose-500";

  return (
    <div className={`p-3.5 rounded-xl border ${borderClass} space-y-2`}>
      <p className="text-xs font-semibold text-ink leading-relaxed">
        {formatCurrencySymbols(headline, symbol, currency)}
      </p>

      {evidence && (
        <div className="flex items-start gap-1.5 text-[11px] text-steel/80 bg-paper/80 p-2 rounded-lg border border-line">
          <span className={`font-black font-mono-data uppercase text-[9px] px-1.5 py-0.5 rounded ${
            accent === "mint" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          }`}>
            Evidence
          </span>
          <span className="leading-snug">{formatCurrencySymbols(evidence, symbol, currency)}</span>
        </div>
      )}

      {counter && (
        <div>
          <button
            type="button"
            onClick={() => setShowCounter(!showCounter)}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-steel/70 hover:text-ink transition-colors"
          >
            {showCounter ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showCounter ? "Hide Counter-risk" : "View Counter-risk"}
          </button>
          {showCounter && (
            <div className="mt-1.5 p-2 rounded-lg text-xs border border-line bg-paper/40 text-steel animate-fade-in leading-relaxed">
              <span className="font-bold text-amber">Counter-risk: </span>
              {formatCurrencySymbols(counter, symbol, currency)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DebatePage() {
  const { result, loadDebate, debateLoading, debateError } = useAnalysis();
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string)?.toUpperCase();

  const [activeTab, setActiveTab] = useState<"arena" | "judge">("arena");
  const [showFullDeliberation, setShowFullDeliberation] = useState(false);
  const [showBullCounters, setShowBullCounters] = useState(false);
  const [showBearCounters, setShowBearCounters] = useState(false);

  useEffect(() => {
    if (!result) router.replace("/");
  }, [result, router]);

  const analysis = result?.analyses.find(
    (item) => item.symbol.split(".")[0].toUpperCase() === symbol
  ) ?? result?.analyses[0];

  useEffect(() => {
    if (analysis && !analysis.debate && !debateLoading && !debateError) void loadDebate(analysis.symbol);
  }, [analysis, debateLoading, debateError, loadDebate]);

  if (!result) return null;

  if (!analysis) {
    router.replace("/");
    return null;
  }

  const sym = analysis.symbol.split(".")[0];
  const base = `/analysis/${sym}`;
  const debate: DebateReport | null | undefined = analysis.debate;

  if (!debate) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
          {debateLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-mint mx-auto" />
          ) : (
            <Scale className="h-8 w-8 text-mint mx-auto" />
          )}
          <h1 className="text-lg font-black text-ink">
            {debateError ? "The debate could not be loaded" : "Preparing the investment debate"}
          </h1>
          <p className="text-sm text-steel">
            {debateError || "The bull and bear cases are being prepared from the completed analyst report."}
          </p>
          {debateError && (
            <button
              type="button"
              onClick={() => void loadDebate(analysis.symbol)}
              className="rounded-lg border border-mint/30 bg-mint/10 px-4 py-2 text-sm font-bold text-mint"
            >
              Try again
            </button>
          )}
        </div>
      </AppShell>
    );
  }

  // Bull case normalization
  const bull = debate.bull_case;
  const bullConfidence = Math.round(Number(bull?.confidence ?? 0.5) * 100);
  const bullThesis = bull?.thesis ?? "";
  const bullArgs: any[] = Array.isArray(bull?.key_arguments)
    ? bull.key_arguments
    : bull?.key_arguments
    ? [bull.key_arguments]
    : [];
  const bullCounters: any[] = Array.isArray(bull?.counterarguments)
    ? bull.counterarguments
    : [];

  // Bear case normalization
  const bear = debate.bear_case;
  const bearConfidence = Math.round(Number(bear?.confidence ?? 0.5) * 100);
  const bearThesis = bear?.thesis ?? "";
  const bearArgs: any[] = Array.isArray(bear?.key_arguments)
    ? bear.key_arguments
    : bear?.key_arguments
    ? [bear.key_arguments]
    : [];
  const bearCounters: any[] = Array.isArray(bear?.counterarguments)
    ? bear.counterarguments
    : [];

  // Verdict normalization
  const verdict = debate.verdict ?? analysis.recommendation;
  const judgeConfidence = Math.round(Number(debate.confidence ?? analysis.confidence) * 100);
  const verdictStyles =
    verdict === "Buy"
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
      : verdict === "Sell"
      ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
      : "bg-amber/10 text-amber border-amber/30";

  const judgeReasoning: string[] = debate.judge_reasoning;
  const evidenceGaps: string[] = debate.evidence_gaps;
  const visibleJudgeReasoning = showFullDeliberation ? judgeReasoning : judgeReasoning.slice(0, 2);

  const totalConv = bullConfidence + bearConfidence || 1;
  const bullShare = Math.round((bullConfidence / totalConv) * 100);
  const bearShare = 100 - bullShare;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up py-2">
        <title>{`Investment Debate — ${analysis.company_name} (${sym}) | Stockmaster.ai`}</title>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-steel">
          <Link href={base} className="text-mint hover:underline">
            Overview ({sym})
          </Link>
          <span>/</span>
          <span className="text-ink">Investment Debate</span>
        </div>

        {/* ── Main Arena Card ── */}
        <div className="rounded-2xl glass-panel-heavy border border-line shadow-panel overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-5 border-b border-line bg-paper/60 gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <Scale className="h-6 w-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black uppercase tracking-wider text-ink">
                    Adversarial Debate Arena · Bull vs Bear
                  </h1>
                  <span className="font-mono-data text-xs font-bold text-mint bg-mint/10 border border-mint/20 px-2 py-0.5 rounded">
                    {sym}
                  </span>
                </div>
                <p className="text-[11px] text-steel mt-0.5">
                  Adversarial Equity Adjudication · {debate?.mode === "llm" ? "CrewAI LLM Debate" : "Deterministic Fallback"}
                </p>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${verdictStyles}`}>
              Judge: {verdict === "Neutral" ? "Neutral (Hold)" : verdict} ({judgeConfidence}%)
            </span>
          </div>

          {/* Conviction Battle Bar */}
          <div className="px-6 py-4 border-b border-line/60 bg-paper/30">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <div className="flex items-center gap-1.5 text-emerald-500">
                <TrendingUp className="h-4 w-4" />
                <span>BULLISH ADVOCATE ({bullConfidence}%)</span>
              </div>
              <span className="text-[10px] uppercase font-mono-data text-steel">
                Evidence Conviction Balance
              </span>
              <div className="flex items-center gap-1.5 text-rose-500">
                <span>BEARISH ADVOCATE ({bearConfidence}%)</span>
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-line/30 overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                style={{ width: `${bullShare}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-500"
                style={{ width: `${bearShare}%` }}
              />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-line px-6 bg-paper/20 overflow-x-auto">
            <button
              onClick={() => setActiveTab("arena")}
              className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "arena"
                  ? "border-mint text-mint bg-mint/5"
                  : "border-transparent text-steel hover:text-ink"
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Bull and Bear Cases</span>
            </button>
            <button
              onClick={() => setActiveTab("judge")}
              className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "judge"
                  ? "border-mint text-mint bg-mint/5"
                  : "border-transparent text-steel hover:text-ink"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Judge Adjudication & Evidence Gaps</span>
            </button>
          </div>

          {/* Tab 1: Bull and Bear Cases */}
          {activeTab === "arena" && (
            <div className="p-6 grid gap-6 lg:grid-cols-2 animate-fade-in">
              {/* Bullish Advocate Pod */}
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                      🐂
                    </span>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wider text-emerald-500">
                        Bullish Advocate Case
                      </h2>
                      <p className="text-[11px] text-steel">Upside Champion & Evidence Defense</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono-data font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    {bullConfidence}% Conviction
                  </span>
                </div>

                {/* Opening thesis banner */}
                <div className="bg-paper/50 border border-emerald-500/20 rounded-xl p-3.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                    Opening Argument
                  </span>
                  <p className="text-xs font-medium text-ink leading-relaxed">
                    {formatCurrencySymbols(bullThesis, sym, analysis.currency)}
                  </p>
                </div>

                {/* Supporting arguments list */}
                {bullArgs.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-steel block">
                      Supporting Arguments ({bullArgs.length})
                    </span>
                    {bullArgs.map((arg, idx) => (
                      <ArgumentItem
                        key={idx}
                        raw={arg}
                        accent="mint"
                        symbol={sym}
                        currency={analysis.currency}
                      />
                    ))}
                  </div>
                )}

                {/* Risks Acknowledged collapsible */}
                {bullCounters.length > 0 && (
                  <div className="pt-2 border-t border-emerald-500/20">
                    <button
                      type="button"
                      onClick={() => setShowBullCounters(!showBullCounters)}
                      className="flex items-center justify-between w-full text-left text-xs font-bold text-steel hover:text-ink transition-colors"
                    >
                      <span>Risks Acknowledged ({bullCounters.length})</span>
                      {showBullCounters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    {showBullCounters && (
                      <div className="mt-2 space-y-2 animate-fade-in">
                        {bullCounters.map((cp, idx) => (
                          <ArgumentItem
                            key={idx}
                            raw={cp}
                            accent="mint"
                            symbol={sym}
                            currency={analysis.currency}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bearish Advocate Pod */}
              <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/30">
                      🐻
                    </span>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wider text-rose-500">
                        Bearish Advocate Case
                      </h2>
                      <p className="text-[11px] text-steel">Downside Risk & Thesis Fragility</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono-data font-bold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                    {bearConfidence}% Conviction
                  </span>
                </div>

                {/* Opening thesis banner */}
                <div className="bg-paper/50 border border-rose-500/20 rounded-xl p-3.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                    Opening Argument
                  </span>
                  <p className="text-xs font-medium text-ink leading-relaxed">
                    {formatCurrencySymbols(bearThesis, sym, analysis.currency)}
                  </p>
                </div>

                {/* Downside arguments list */}
                {bearArgs.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-steel block">
                      Downside Arguments ({bearArgs.length})
                    </span>
                    {bearArgs.map((arg, idx) => (
                      <ArgumentItem
                        key={idx}
                        raw={arg}
                        accent="berry"
                        symbol={sym}
                        currency={analysis.currency}
                      />
                    ))}
                  </div>
                )}

                {/* Bull Case Considered collapsible */}
                {bearCounters.length > 0 && (
                  <div className="pt-2 border-t border-rose-500/20">
                    <button
                      type="button"
                      onClick={() => setShowBearCounters(!showBearCounters)}
                      className="flex items-center justify-between w-full text-left text-xs font-bold text-steel hover:text-ink transition-colors"
                    >
                      <span>Bull Case Considered ({bearCounters.length})</span>
                      {showBearCounters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    {showBearCounters && (
                      <div className="mt-2 space-y-2 animate-fade-in">
                        {bearCounters.map((cp, idx) => (
                          <ArgumentItem
                            key={idx}
                            raw={cp}
                            accent="berry"
                            symbol={sym}
                            currency={analysis.currency}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Judge Adjudication & Evidence Gaps */}
          {activeTab === "judge" && (
            <div className="p-6 space-y-6 animate-fade-in">
              {/* Adjudication Summary */}
              <div className="rounded-2xl border border-line bg-paper/60 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-mint" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                    Committee Adjudication Summary
                  </h3>
                </div>
                <p className="text-xs font-medium text-ink leading-relaxed">
                  {formatCurrencySymbols(debate?.summary || analysis.target_bias, sym, analysis.currency)}
                </p>
              </div>

              {/* Judge Reasoning Pillars */}
              {judgeReasoning.length > 0 && (
                <div className="rounded-2xl border border-line bg-paper/60 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                      Judge reasoning ({judgeReasoning.length})
                    </h3>
                    {judgeReasoning.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setShowFullDeliberation((isOpen) => !isOpen)}
                        className="text-xs font-bold text-mint hover:underline"
                        aria-expanded={showFullDeliberation}
                        aria-controls="judge-deliberation-list"
                      >
                        {showFullDeliberation ? "Show less" : "Show Full Deliberation"}
                      </button>
                    )}
                  </div>
                  <div id="judge-deliberation-list" className="space-y-2.5">
                    {visibleJudgeReasoning.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-line bg-paper/40 text-xs leading-relaxed text-ink space-y-1"
                      >
                        <span className="text-[10px] font-black uppercase tracking-wider text-mint block">
                          Reasoning Factor {idx + 1}
                        </span>
                        <p>{formatCurrencySymbols(item, sym, analysis.currency)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence Gaps Identified */}
              {evidenceGaps.length > 0 && (
                <div className="rounded-2xl border border-amber/30 bg-amber/5 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber">
                    <AlertTriangle className="h-4 w-4" />
                    <h3 className="text-sm font-black uppercase tracking-wider">
                      Critical Evidence Gaps Identified
                    </h3>
                  </div>
                  <p className="text-xs text-steel leading-relaxed">
                    The committee identified missing disclosures or conflicting signals during its review:
                  </p>
                  <ul className="space-y-2">
                    {evidenceGaps.map((gap, idx) => (
                      <li
                        key={idx}
                        className="p-3 rounded-xl border border-line bg-paper/60 text-xs text-ink leading-relaxed flex items-start gap-2.5"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber mt-1.5 shrink-0" />
                        <span>{formatCurrencySymbols(gap, sym, analysis.currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              {debate?.disclaimer && (
                <p className="text-[11px] text-steel/60 leading-relaxed border-t border-line pt-3">
                  {debate.disclaimer}
                </p>
              )}
            </div>
          )}
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
