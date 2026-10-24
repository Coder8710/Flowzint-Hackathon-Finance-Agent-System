"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Activity, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  ChevronRight,
  Maximize2
} from "lucide-react";
import { DebateReport } from "@/lib/types";

interface DebateArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  debate: DebateReport;
  symbol: string;
  companyName: string;
}

export function parseArgumentEntry(raw: string): {
  headline: string;
  evidence?: string;
  counter?: string;
} {
  if (!raw) return { headline: "" };
  let str = raw.trim();

  // Handle Python dict-like string or JSON
  if (
    (str.startsWith("{") && str.endsWith("}")) ||
    str.includes("'argument':") ||
    str.includes('"argument":') ||
    str.includes("'bull_claim':") ||
    str.includes("'bear_concern':")
  ) {
    try {
      // Clean string into valid JSON if possible
      const jsonStr = str
        .replace(/'/g, '"')
        .replace(/True/g, "true")
        .replace(/False/g, "false")
        .replace(/None/g, "null");
      const parsed = JSON.parse(jsonStr);

      const headline =
        parsed.argument ||
        parsed.claim ||
        parsed.bull_claim ||
        parsed.bear_concern ||
        parsed.point ||
        parsed.thesis ||
        "";
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
      // Regex fallback if JSON parse fails
      const argMatch = str.match(/['"]argument['"]\s*:\s*['"]([^'"]+)['"]/i) ||
                       str.match(/['"]bull_claim['"]\s*:\s*['"]([^'"]+)['"]/i) ||
                       str.match(/['"]bear_concern['"]\s*:\s*['"]([^'"]+)['"]/i);
      const evMatch = str.match(/['"]evidence['"]\s*:\s*['"]([^'"]+)['"]/i);
      const flawMatch = str.match(/['"]critical_flaw['"]\s*:\s*['"]([^'"]+)['"]/i) ||
                        str.match(/['"]response['"]\s*:\s*['"]([^'"]+)['"]/i);

      if (argMatch) {
        return {
          headline: argMatch[1].trim(),
          evidence: evMatch ? evMatch[1].trim() : undefined,
          counter: flawMatch ? flawMatch[1].trim() : undefined,
        };
      }
    }
  }

  // Handle formatted separator " — "
  if (str.includes(" — Evidence: ")) {
    const [head, rest] = str.split(" — Evidence: ");
    const [ev, note] = (rest || "").split(" — Note: ");
    return {
      headline: head.trim(),
      evidence: ev ? ev.trim() : undefined,
      counter: note ? note.trim() : undefined,
    };
  }

  // Strip any residual json/dict brackets
  const cleaned = str
    .replace(/^\{+/, "")
    .replace(/\}+$/, "")
    .replace(/['"]?argument['"]?\s*:\s*['"]?/gi, "")
    .replace(/['"]?evidence['"]?\s*:\s*['"]?/gi, " Evidence: ")
    .replace(/['"]?critical_flaw['"]?\s*:\s*['"]?/gi, " Counter-risk: ")
    .replace(/['"]?bear_concern['"]?\s*:\s*['"]?/gi, " Bear Concern: ")
    .replace(/['"]?bull_claim['"]?\s*:\s*['"]?/gi, " Bull Claim: ")
    .trim();

  return { headline: cleaned };
}

export function DebateArenaModal({
  isOpen,
  onClose,
  debate,
  symbol,
  companyName,
}: DebateArenaModalProps) {
  const [activeTab, setActiveTab] = useState<"arena" | "judge">("arena");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close on Escape key & handle background scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const bullConfidence = Math.round(debate.bull_case.confidence * 100);
  const bearConfidence = Math.round(debate.bear_case.confidence * 100);
  const judgeConfidence = Math.round(debate.confidence * 100);

  const verdictStyles =
    debate.verdict === "Buy"
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
      : debate.verdict === "Sell"
      ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
      : "bg-amber-500/10 text-amber-500 border-amber-500/30";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-6xl h-[88vh] max-h-[88vh] flex flex-col rounded-3xl glass-panel-heavy border border-line shadow-2xl overflow-hidden bg-terminalBg/95">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-paper/60">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Scale className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wider text-ink">
                  Adversarial Debate Arena
                </h2>
                <span className="font-mono-data text-xs font-bold text-mint bg-mint/10 border border-mint/20 px-2 py-0.5 rounded">
                  {symbol}
                </span>
                <span className="text-xs text-steel/70 hidden sm:inline">
                  {companyName}
                </span>
              </div>
              <p className="text-[11px] text-steel">
                Adversarial Equity Adjudication · {debate.mode === "llm" ? "CrewAI LLM Debate" : "Deterministic Fallback"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${verdictStyles}`}>
              Judge: {debate.verdict === "Neutral" ? "Neutral (Hold)" : debate.verdict} ({judgeConfidence}%)
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-line bg-paper/40 text-steel hover:text-ink hover:bg-paper transition-all"
              title="Close Debate Arena (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Conviction Battle Bar */}
        <div className="px-6 py-3 border-b border-line/60 bg-paper/30">
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
              style={{ width: `${(bullConfidence / (bullConfidence + bearConfidence || 1)) * 100}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-500"
              style={{ width: `${(bearConfidence / (bullConfidence + bearConfidence || 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-line px-6 bg-paper/20">
          <button
            onClick={() => setActiveTab("arena")}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
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
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "judge"
                ? "border-mint text-mint bg-mint/5"
                : "border-transparent text-steel hover:text-ink"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Judge Adjudication & Evidence Gaps</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {activeTab === "arena" && (
            <div className="grid gap-6 lg:grid-cols-2">
              
              {/* Bullish Advocate Pod */}
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
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

                {/* Bull Thesis Banner */}
                <div className="bg-paper/40 border border-emerald-500/20 rounded-xl p-3.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                    Opening Argument
                  </span>
                  <p className="text-xs font-medium text-ink leading-relaxed">
                    {debate.bull_case.thesis}
                  </p>
                </div>

                {/* Supporting Arguments */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Supporting Evidence Points ({debate.bull_case.key_arguments.length})
                  </h4>
                  <div className="space-y-2.5">
                    {debate.bull_case.key_arguments.map((rawArg, idx) => {
                      const item = parseArgumentEntry(rawArg);
                      return (
                        <div
                          key={idx}
                          className="bg-paper/60 border border-line rounded-xl p-3 space-y-1.5 text-xs"
                        >
                          <div className="font-bold text-ink leading-snug">
                            {item.headline}
                          </div>
                          {item.evidence && (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/15 leading-relaxed">
                              <strong>Data / Evidence:</strong> {item.evidence}
                            </div>
                          )}
                          {item.counter && (
                            <div className="text-[11px] text-steel/80 bg-paper/30 p-2 rounded-lg border border-line leading-relaxed">
                              <strong>Note:</strong> {item.counter}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Risks Acknowledged */}
                {debate.bull_case.counterarguments.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-500 mb-2 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Risks Acknowledged by Bull
                    </h4>
                    <ul className="space-y-1.5">
                      {debate.bull_case.counterarguments.map((raw, idx) => {
                        const item = parseArgumentEntry(raw);
                        return (
                          <li
                            key={idx}
                            className="text-xs text-steel bg-paper/30 border border-line/50 p-2.5 rounded-lg leading-relaxed"
                          >
                            • {item.headline}
                          </li>
                        );
                      })}
                    </ul>
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
                      <h3 className="text-sm font-black uppercase tracking-wider text-rose-500">
                        Bearish Advocate Case
                      </h3>
                      <p className="text-[11px] text-steel">Downside Prosecutor & Stress-Tester</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono-data font-bold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                    {bearConfidence}% Conviction
                  </span>
                </div>

                {/* Bear Thesis Banner */}
                <div className="bg-paper/40 border border-rose-500/20 rounded-xl p-3.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                    Opening Argument
                  </span>
                  <p className="text-xs font-medium text-ink leading-relaxed">
                    {debate.bear_case.thesis}
                  </p>
                </div>

                {/* Downside Arguments */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Downside Points & Flaws ({debate.bear_case.key_arguments.length})
                  </h4>
                  <div className="space-y-2.5">
                    {debate.bear_case.key_arguments.map((rawArg, idx) => {
                      const item = parseArgumentEntry(rawArg);
                      return (
                        <div
                          key={idx}
                          className="bg-paper/60 border border-line rounded-xl p-3 space-y-1.5 text-xs"
                        >
                          <div className="font-bold text-ink leading-snug">
                            {item.headline}
                          </div>
                          {item.evidence && (
                            <div className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/15 leading-relaxed">
                              <strong>Downside Metric:</strong> {item.evidence}
                            </div>
                          )}
                          {item.counter && (
                            <div className="text-[11px] text-amber-500 bg-amber-500/10 p-2 rounded-lg border border-amber-500/15 leading-relaxed">
                              <strong>Critical Flaw:</strong> {item.counter}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bull Case Considered */}
                {debate.bear_case.counterarguments.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-steel mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Bull Points Evaluated by Bear
                    </h4>
                    <ul className="space-y-1.5">
                      {debate.bear_case.counterarguments.map((raw, idx) => {
                        const item = parseArgumentEntry(raw);
                        return (
                          <li
                            key={idx}
                            className="text-xs text-steel bg-paper/30 border border-line/50 p-2.5 rounded-lg leading-relaxed"
                          >
                            • {item.headline}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "judge" && (
            <div className="space-y-5 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-line bg-paper/40 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                      ⚖️
                    </span>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                        Independent Judge Adjudication
                      </h3>
                      <p className="text-[11px] text-steel">Chief Investment Judge Ruling</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${verdictStyles}`}>
                    Verdict: {debate.verdict === "Neutral" ? "Neutral (Hold)" : debate.verdict}
                  </span>
                </div>

                <div className="bg-paper/60 border border-line p-4 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-steel block mb-1">
                    Executive Ruling
                  </span>
                  <p className="text-xs font-semibold text-ink leading-relaxed">
                    {debate.summary}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-ink mb-2">
                    Step-by-Step Reasoned Deliberation ({debate.judge_reasoning.length})
                  </h4>
                  <ul className="space-y-2">
                    {debate.judge_reasoning.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-steel bg-paper/20 border border-line/60 p-3 rounded-xl leading-relaxed flex items-start gap-2.5"
                      >
                        <span className="h-4 w-4 rounded-full bg-indigo-500/10 text-indigo-500 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {debate.evidence_gaps.length > 0 && (
                  <div className="pt-3 border-t border-line">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-2 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" /> Evidence Gaps & Uncertainty Points
                    </h4>
                    <ul className="space-y-1.5">
                      {debate.evidence_gaps.map((gap, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-steel bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-lg leading-relaxed"
                        >
                          • {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-line bg-paper/40 text-[11px] text-steel">
          <span>{debate.disclaimer}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-paper border border-line text-xs font-bold text-ink hover:border-mint transition-colors"
          >
            Close Arena
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
