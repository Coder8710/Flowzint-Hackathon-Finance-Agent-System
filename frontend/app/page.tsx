"use client";

import React, { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Brain,
  Briefcase,
  HelpCircle,
  Loader2,
  Newspaper,
  Search,
  Shield,
  SlidersHorizontal,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";
import { AppShell } from "@/components/AppShell";
import { PortfolioContextGuide } from "@/components/PortfolioContextGuide";
import { filterCompaniesLocal, addCompaniesToPool } from "@/lib/companies";

// Highlight matched search text
function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <span>{text}</span>;
  const lowerText = text.toLowerCase();
  const lowerHighlight = highlight.toLowerCase();
  const index = lowerText.indexOf(lowerHighlight);

  if (index !== -1) {
    const before = text.substring(0, index);
    const match = text.substring(index, index + highlight.length);
    const after = text.substring(index + highlight.length);
    return (
      <span>
        {before}
        <span className="text-mint font-extrabold bg-mint/10 px-0.5 rounded">{match}</span>
        {after}
      </span>
    );
  }
  return <span>{text}</span>;
}

// Quick-select company chips
const quickCompanies = [
  { name: "NVIDIA",   symbol: "NVDA",  exchange: "NASDAQ" },
  { name: "Apple",    symbol: "AAPL",  exchange: "NASDAQ" },
  { name: "Microsoft",symbol: "MSFT",  exchange: "NASDAQ" },
  { name: "Google",   symbol: "GOOG",  exchange: "NASDAQ" },
  { name: "Tesla",    symbol: "TSLA",  exchange: "NASDAQ" },
  { name: "Reliance", symbol: "RELIANCE", exchange: "NSE" },
];

const agentSteps = [
  { name: "News & Market Specialist", icon: Newspaper, desc: "Scanning news feeds and analysing market headlines..." },
  { name: "Fundamental Analysis Agent", icon: BarChart3, desc: "Evaluating company financials, valuation, and growth data..." },
  { name: "Technical Analysis Agent", icon: TrendingUp, desc: "Reviewing price trends, momentum, and chart patterns..." },
  { name: "Sentiment Analysis Agent", icon: Brain, desc: "Measuring public mood, social buzz, and investor sentiment..." },
  { name: "Risk Analysis Agent", icon: Shield, desc: "Assessing risk level, volatility, and potential downsides..." },
  { name: "Portfolio Advisor Agent", icon: Briefcase, desc: "Reviewing how this fits your portfolio and investment goals..." },
  { name: "Final Verdict Coordinator", icon: Activity, desc: "Combining all findings into a clear investment recommendation..." },
];

export default function Home() {
  const { runAnalysis, loading, error, result } = useAnalysis();
  const router = useRouter();

  const [query, setQuery] = useState("Is Apple a good long-term investment?");
  const [riskTolerance, setRiskTolerance] = useState<"low" | "medium" | "high">("medium");
  const [horizon, setHorizon] = useState<"short" | "medium" | "long">("medium");
  const [portfolioContext, setPortfolioContext] = useState("");
  const [activeAgent, setActiveAgent] = useState(0);

  // Search & autocomplete
  const [searchVal, setSearchVal] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedCompany, setSelectedCompany] = useState<{
    name: string;
    symbol: string;
    fullSymbol: string;
    exchange: string;
  } | null>({
    name: "Apple Inc.",
    symbol: "AAPL",
    fullSymbol: "AAPL",
    exchange: "NASDAQ",
  });

  // Redirect to analysis page when result arrives
  useEffect(() => {
    if (result && !loading) {
      const sym = result.analyses[0]?.symbol?.split(".")[0];
      if (sym) {
        router.push(`/analysis/${sym}`);
      }
    }
  }, [result, loading, router]);

  // Simulate agent pipeline ticker during loading
  useEffect(() => {
    if (!loading) {
      setActiveAgent(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveAgent((prev) => (prev < agentSteps.length - 1 ? prev + 1 : prev));
    }, 3200);
    return () => clearInterval(interval);
  }, [loading]);

  // Click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".relative-autocomplete")) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced autocomplete search
  useEffect(() => {
    let active = true;
    const trimmedVal = searchVal.trim();
    if (trimmedVal.length < 1) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    const localMatches = filterCompaniesLocal(trimmedVal);
    setSuggestions(localMatches);
    if (localMatches.length > 0) setSearchOpen(true);
    setActiveIndex(-1);

    setSearchLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const { searchCompanies } = await import("@/lib/api");
        const backendMatches = await searchCompanies(trimmedVal);
        if (!active) return;
        addCompaniesToPool(backendMatches);
        const updatedList = filterCompaniesLocal(trimmedVal);
        setSuggestions(updatedList);
        if (updatedList.length > 0) setSearchOpen(true);
      } catch (err) {
        console.error("Backend company search error:", err);
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [searchVal]);

  const selectSuggestion = (suggestion: any) => {
    setQuery(`Analyze ${suggestion.name}`);
    setSearchVal("");
    setSuggestions([]);
    setSearchOpen(false);
    setActiveIndex(-1);
    setSelectedCompany({
      name: suggestion.name,
      symbol: suggestion.symbol.split(".")[0],
      fullSymbol: suggestion.symbol,
      exchange: suggestion.exchange,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSearchOpen(false);
    }
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCompany) return;
    await runAnalysis({
      query,
      symbol: selectedCompany.fullSymbol,
      company_name: selectedCompany.name,
      risk_tolerance: riskTolerance,
      horizon,
      portfolio_context: portfolioContext || undefined,
    });
  }

  return (
    <AppShell>
      <div className="py-2">
        {loading ? (
          /* ── Loading Mode: Agent Pipeline Tracker ── */
          <div className="flex flex-col items-center justify-center min-h-[520px] animate-fade-in p-6">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-mint">
              CrewAI Financial Intelligence Pipeline
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-ink">
              Orchestrating Sub-Agents
            </h2>
            <p className="mt-2 max-w-sm text-center text-xs text-steel leading-relaxed">
              Synthesizing market telemetry for{" "}
              <span className="text-mint font-bold">{selectedCompany?.name || query}</span> across 6 analytical vectors.
            </p>

            {/* Stepper Display */}
            <div className="mt-8 grid gap-2.5 w-full max-w-md">
              {agentSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === activeAgent;
                const isDone = index < activeAgent;

                return (
                  <div
                    key={step.name}
                    className={`flex items-center gap-3.5 border p-3.5 rounded-xl transition-all duration-300 ${
                      isActive
                        ? "border-mint/30 bg-mint/5 shadow-[0_0_15px_rgba(8,153,129,0.08)]"
                        : isDone
                        ? "border-line bg-paper/40 opacity-70"
                        : "border-line/30 bg-paper/10 opacity-30"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 border transition-colors ${
                        isActive
                          ? "bg-mint/10 border-mint/20 text-mint"
                          : isDone
                          ? "bg-paper border-line text-mint"
                          : "bg-paper/30 border-line/30 text-steel/30"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-bold uppercase tracking-wider ${isActive ? "text-ink" : "text-steel/70"}`}>
                          {step.name}
                        </p>
                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-mint animate-ping" />}
                      </div>
                      <p className={`text-xs mt-0.5 truncate leading-relaxed ${isActive ? "text-steel" : "text-steel/40"}`}>
                        {isDone ? "Analysis complete." : isActive ? step.desc : "Waiting to start..."}
                      </p>
                    </div>

                    {isActive && (
                      <Loader2 className="h-3.5 w-3.5 text-mint animate-spin shrink-0" aria-hidden />
                    )}
                    {isDone && (
                      <span className="text-xs font-mono-data font-black text-mint bg-mint/10 px-2 py-0.5 rounded border border-mint/20 shrink-0">
                        DONE
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress Slider */}
            <div className="mt-8 w-full max-w-md">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/20 border border-line/10">
                <div
                  className="h-full bg-gradient-to-r from-mint to-indigo-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((activeAgent + 1) / agentSteps.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2.5 text-[10px] font-mono-data font-bold text-steel/60">
                <span>STAGE: {activeAgent + 1} / {agentSteps.length}</span>
                <span>{Math.round(((activeAgent + 1) / agentSteps.length) * 100)}% COMPILED</span>
              </div>
            </div>
          </div>
        ) : (
          /* ── Main Dual-Panel Setup Grid ── */
          <div className="grid gap-6 lg:grid-cols-[420px_1fr] items-start">
            {/* Left Column: Research Settings Control Deck */}
            <aside>
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl glass-panel p-6 shadow-panel border border-line space-y-5 animate-fade-in-up"
              >
                <div className="flex items-center gap-2 pb-3 border-b border-line">
                  <SlidersHorizontal className="h-4 w-4 text-mint" aria-hidden />
                  <h2 className="text-sm font-black uppercase tracking-wider text-ink">
                    Research Settings
                  </h2>
                </div>

                {/* Active Report Resumption Pill (if user navigated back to search) */}
                {result && !loading && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-mint/5 border border-mint/20 text-xs animate-fade-in">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full bg-mint animate-pulse shrink-0" />
                      <span className="text-steel truncate">
                        Active: <strong className="text-ink">{result.analyses[0]?.company_name || result.analyses[0]?.symbol}</strong>
                      </span>
                    </div>
                    <Link
                      href={`/analysis/${result.analyses[0]?.symbol?.split(".")[0]}`}
                      className="text-mint font-bold hover:underline shrink-0 ml-2"
                    >
                      View Report →
                    </Link>
                  </div>
                )}

                {/* Autocomplete Company Search */}
                <div className="relative relative-autocomplete">
                  <label
                    className="block text-xs font-bold uppercase tracking-wider text-steel mb-1.5"
                    htmlFor="company-search"
                  >
                    Quick Company Search
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="company-search"
                      type="text"
                      value={searchVal}
                      onChange={(event) => {
                        setSearchVal(event.target.value);
                        setSearchOpen(true);
                        if (event.target.value.trim()) setSelectedCompany(null);
                      }}
                      onFocus={() => {
                        if (searchVal.trim().length > 0) setSearchOpen(true);
                      }}
                      onKeyDown={handleKeyDown}
                      className="h-10 w-full border border-line bg-terminalBg/40 pl-9 pr-10 text-xs font-bold text-ink outline-none rounded-lg transition-colors focus:border-mint placeholder-steel/45"
                      placeholder="Type company name (e.g. Cian Agro, Apple...)"
                      autoComplete="off"
                    />
                    <Search className="absolute left-3 h-3.5 w-3.5 text-steel/50" />
                    {searchLoading && (
                      <Loader2 className="absolute right-3 h-3.5 w-3.5 animate-spin text-mint" />
                    )}
                  </div>

                  {/* Selected company chip */}
                  {selectedCompany && (
                    <div className="mt-2.5 flex items-center gap-2 animate-fade-in">
                      <div className="flex items-center gap-2.5 bg-mint/8 border border-mint/20 rounded-lg px-3 py-2 flex-1 min-w-0">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-mint/15 border border-mint/25">
                          <span className="text-[9px] font-black font-mono-data text-mint">
                            {selectedCompany.symbol.slice(0, 3)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-ink truncate">{selectedCompany.name}</p>
                          <p className="text-[10px] font-mono-data text-steel/60">
                            {selectedCompany.symbol} · {selectedCompany.exchange}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCompany(null);
                          setQuery("");
                        }}
                        className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border border-line text-steel/50 hover:border-berry/40 hover:text-berry transition-colors"
                        title="Clear selection"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Suggestions Dropdown */}
                  {searchOpen && searchVal.trim().length > 0 && (
                    <div className="absolute left-0 right-0 z-[9999] mt-1 max-h-60 overflow-y-auto rounded-xl border border-line bg-paper backdrop-blur-md p-1 shadow-2xl animate-fade-in divide-y divide-line/20">
                      {suggestions.length > 0 ? (
                        suggestions.map((suggestion, index) => (
                          <button
                            key={suggestion.symbol}
                            type="button"
                            onMouseEnter={() => setActiveIndex(index)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectSuggestion(suggestion);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs rounded-lg transition-colors group ${
                              index === activeIndex
                                ? "bg-mint/10 text-mint"
                                : "text-steel hover:bg-mint/5 hover:text-mint"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p
                                className={`font-bold truncate group-hover:text-mint transition-colors ${
                                  index === activeIndex ? "text-mint" : "text-ink"
                                }`}
                              >
                                <HighlightedText text={suggestion.name} highlight={searchVal} />
                              </p>
                              <p
                                className={`text-[10px] font-mono-data mt-0.5 ${
                                  index === activeIndex ? "text-mint/70" : "text-steel/50"
                                }`}
                              >
                                <HighlightedText
                                  text={suggestion.symbol.split(".")[0]}
                                  highlight={searchVal}
                                />
                              </p>
                            </div>
                            <span
                              className={`shrink-0 font-mono-data font-black text-[9px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${
                                index === activeIndex
                                  ? "bg-mint/20 border-mint/30 text-mint"
                                  : "bg-line/20 border-line text-steel/70"
                              }`}
                            >
                              {suggestion.exchange}
                            </span>
                          </button>
                        ))
                      ) : !searchLoading ? (
                        <div className="px-4 py-6 text-center text-xs text-steel/50">
                          <HelpCircle className="mx-auto h-6 w-6 text-steel/30 mb-2 animate-pulse" />
                          No results found for &ldquo;<span className="text-mint font-bold">{searchVal}</span>&rdquo;
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Quick Select Chips */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-steel/60 mb-2">
                    Quick Select
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickCompanies.map((co) => (
                      <button
                        key={co.symbol}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectSuggestion({ name: co.name, symbol: co.symbol, exchange: co.exchange });
                        }}
                        className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                          selectedCompany?.symbol === co.symbol
                            ? "border-mint bg-mint/10 text-mint shadow-[0_0_10px_rgba(8,153,129,0.15)]"
                            : "border-line bg-paper/30 hover:border-mint hover:bg-mint/5 text-steel hover:text-mint"
                        }`}
                      >
                        <span className="font-mono-data font-black text-[10px]">{co.symbol}</span>
                        <span className="text-steel/40 font-normal">·</span>
                        <span>{co.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risk & Horizon Dropdowns */}
                <div className="grid gap-3 sm:grid-cols-2 pt-1">
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wider text-steel mb-1.5"
                      htmlFor="risk"
                    >
                      Risk Tolerance
                    </label>
                    <select
                      id="risk"
                      value={riskTolerance}
                      onChange={(event) =>
                        setRiskTolerance(event.target.value as "low" | "medium" | "high")
                      }
                      className="h-10 w-full border border-line bg-terminalBg/60 px-3 text-xs font-bold text-ink outline-none rounded-lg transition-colors focus:border-mint"
                    >
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                    </select>
                  </div>

                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wider text-steel mb-1.5"
                      htmlFor="horizon"
                    >
                      Investment Horizon
                    </label>
                    <select
                      id="horizon"
                      value={horizon}
                      onChange={(event) =>
                        setHorizon(event.target.value as "short" | "medium" | "long")
                      }
                      className="h-10 w-full border border-line bg-terminalBg/60 px-3 text-xs font-bold text-ink outline-none rounded-lg transition-colors focus:border-mint"
                    >
                      <option value="short">Short Term</option>
                      <option value="medium">Medium Term</option>
                      <option value="long">Long Term</option>
                    </select>
                  </div>
                </div>

                {/* Portfolio Context Guide (collapsible builder + 1-click presets) */}
                <PortfolioContextGuide value={portfolioContext} onChange={setPortfolioContext} />

                {/* Error Banner */}
                {error && (
                  <div className="p-3.5 rounded-xl border border-berry/30 bg-berry/10 text-xs font-bold text-berry animate-fade-in">
                    {error}
                  </div>
                )}

                {/* Submit: ANALYZE NOW */}
                <button
                  type="submit"
                  disabled={loading || !selectedCompany}
                  className="relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden bg-mint font-black text-white dark:text-slate-950 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(8,153,129,0.35)] hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
                >
                  <Zap className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wider">Analyze Now</span>
                </button>
              </form>
            </aside>

            {/* Right Column: Platform Hero & Dimension Briefing */}
            <div className="rounded-2xl glass-panel p-8 border border-line shadow-panel flex flex-col justify-center items-center text-center animate-fade-in min-h-[540px]">
              <div className="relative mb-6 animate-float">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-mint to-indigo-500 opacity-20 blur-xl w-16 h-16 mx-auto" />
                <div className="h-16 w-16 rounded-full bg-paper border border-line flex items-center justify-center text-3xl shadow-sm">
                  🔮
                </div>
              </div>

              <span className="text-xs font-black uppercase tracking-[0.2em] text-steel/60">
                Decision Support Engine
              </span>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink max-w-md leading-snug">
                Unified Multi-Agent Financial Research
              </h2>
              <p className="mt-3 max-w-md text-xs font-medium text-steel leading-relaxed">
                Select any ticker or company above to launch six collaborative AI sub-agents. 
                Our committee synthesizes live fundamental metrics, technical patterns, catalyst headlines, sentiment feeds, and portfolio constraints into an institutional-grade research dossier.
              </p>

              <div className="mt-8 grid gap-3.5 grid-cols-1 sm:grid-cols-2 max-w-lg w-full text-left">
                <div className="p-3.5 bg-paper/50 border border-line rounded-xl hover:border-mint/30 transition-all">
                  <div className="text-mint font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Real-time Market Feeds
                  </div>
                  <p className="text-[11px] text-steel/70 leading-relaxed">
                    Live technical indicators, financial statements, and catalyst crawls.
                  </p>
                </div>

                <div className="p-3.5 bg-paper/50 border border-line rounded-xl hover:border-indigo-500/30 transition-all">
                  <div className="text-indigo-500 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> Committee Debate
                  </div>
                  <p className="text-[11px] text-steel/70 leading-relaxed">
                    Adversarial Bull vs Bear advocates cross-examined before ruling.
                  </p>
                </div>

                <div className="p-3.5 bg-paper/50 border border-line rounded-xl hover:border-mint/30 transition-all">
                  <div className="text-mint font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" /> 6-Pillar Thesis
                  </div>
                  <p className="text-[11px] text-steel/70 leading-relaxed">
                    Valuation, growth runway, technical levels, and economic moats.
                  </p>
                </div>

                <div className="p-3.5 bg-paper/50 border border-line rounded-xl hover:border-amber transition-all">
                  <div className="text-amber font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> Action Plan
                  </div>
                  <p className="text-[11px] text-steel/70 leading-relaxed">
                    Prioritized stop-loss, entry triggers, and tranche execution checklist.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
