"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { 
  Activity, 
  BarChart3, 
  Brain, 
  Loader2, 
  Newspaper, 
  Search, 
  Shield, 
  SlidersHorizontal, 
  TrendingUp, 
  Zap, 
  Sparkles,
  Sun,
  Moon,
  HelpCircle
} from "lucide-react";
import { analyzeStock } from "@/lib/api";
import { AnalysisResponse } from "@/lib/types";
import { AnalysisReport } from "@/components/AnalysisReport";
import { formatCurrencySymbols } from "@/lib/currency";
import { filterCompaniesLocal, addCompaniesToPool } from "../lib/companies";

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

  // Fuzzy match character-by-character highlighting fallback
  const parts: React.ReactNode[] = [];
  let queryIdx = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (queryIdx < highlight.length && char.toLowerCase() === highlight[queryIdx].toLowerCase()) {
      parts.push(
        <span key={i} className="text-mint font-extrabold bg-mint/10 px-0.5 rounded">
          {char}
        </span>
      );
      queryIdx++;
    } else {
      parts.push(<span key={i}>{char}</span>);
    }
  }
  return <span>{parts}</span>;
}


const sampleQueries = [
  "Analyze NVIDIA stock", 
  "Is Suzlon Energy a good buy?", 
  "Compare Apple vs Microsoft"
];

const agentSteps = [
  { name: "News & Market Specialist", icon: Newspaper, desc: "Scanning news feeds and analysing market headlines..." },
  { name: "Fundamental Analysis Agent", icon: BarChart3, desc: "Evaluating company financials, valuation, and growth data..." },
  { name: "Technical Analysis Agent", icon: TrendingUp, desc: "Reviewing price trends, momentum, and chart patterns..." },
  { name: "Sentiment Analysis Agent", icon: Brain, desc: "Measuring public mood, social buzz, and investor sentiment..." },
  { name: "Risk Analysis Agent", icon: Shield, desc: "Assessing risk level, volatility, and potential downsides..." },
  { name: "Final Verdict Coordinator", icon: Activity, desc: "Combining all findings into a clear investment recommendation..." },
];

export default function Home() {
  const [query, setQuery] = useState("Is Suzlon Energy a good buy?");
  const [riskTolerance, setRiskTolerance] = useState<"low" | "medium" | "high">("medium");
  const [horizon, setHorizon] = useState<"short" | "medium" | "long">("medium");
  const [portfolioContext, setPortfolioContext] = useState("");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const [searchVal, setSearchVal] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const symbols = useMemo(() => {
    if (!result) return "IDLE";
    return result.symbols.map(s => s.split(".")[0]).join(" / ");
  }, [result]);

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

  // Debounced autocomplete search (hybrid local search + backend fetching)
  useEffect(() => {
    let active = true;
    const trimmedVal = searchVal.trim();
    if (trimmedVal.length < 1) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    // 1. Immediately filter locally from our pre-indexed pools (fast, sub-100ms path)
    const localMatches = filterCompaniesLocal(trimmedVal);
    setSuggestions(localMatches);
    if (localMatches.length > 0) {
      setSearchOpen(true);
    }
    setActiveIndex(-1);

    // 2. Set search loading state and trigger backend fetch for any other matching companies
    setSearchLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const { searchCompanies } = await import("@/lib/api");
        const backendMatches = await searchCompanies(trimmedVal);
        
        if (!active) return;

        // Add new matches to our local index pool
        addCompaniesToPool(backendMatches);
        
        // Re-run local filter with the enriched index to ensure consistent ranking and matching
        const updatedList = filterCompaniesLocal(trimmedVal);
        setSuggestions(updatedList);
        if (updatedList.length > 0) {
          setSearchOpen(true);
        }
      } catch (err) {
        console.error("Backend company search error:", err);
      } finally {
        if (active) {
          setSearchLoading(false);
        }
      }
    }, 180); // Debounce by 180ms to avoid spamming the backend API

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [searchVal]);

  const selectSuggestion = (suggestion: any) => {
    setQuery(`Analyze ${suggestion.symbol} (${suggestion.name})`);
    setSearchVal("");
    setSuggestions([]);
    setSearchOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSearchOpen(false);
    }
  };

  // Sync theme setup on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const currentTheme = saved || "dark";
    setTheme(currentTheme);
    if (currentTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Simulate agent progress during loading to show active pipelines
  useEffect(() => {
    if (!loading) {
      setActiveAgent(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveAgent((prev) => (prev < agentSteps.length - 1 ? prev + 1 : prev));
    }, 4500); // 4.5s per agent phase
    return () => clearInterval(interval);
  }, [loading]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setActiveAgent(0);
    try {
      const response = await analyzeStock({
        query,
        risk_tolerance: riskTolerance,
        horizon,
        portfolio_context: portfolioContext || undefined
      });
      setResult(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to run agent pipeline analysis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen pb-12 transition-colors duration-200">
      {/* Premium Header */}
      <header className="border-b border-line bg-paper/65 backdrop-blur-md sticky top-0 z-50 animate-fade-in">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-mint animate-pulse" />
              <p className="text-xs font-black text-mint tracking-[0.18em] uppercase">StockSense AI</p>
            </div>
            <h1 className="break-words text-xl font-extrabold tracking-tight text-ink mt-0.5 font-sans">
              Your AI Investment Research Partner
            </h1>
          </div>
          
          <div className="flex items-center gap-3 self-end lg:self-auto">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-paper text-ink transition-all hover:bg-line/40 active:scale-95 shadow-sm"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-500" />
              )}
            </button>

            <div className="flex h-9 items-center gap-2 border border-line bg-paper px-3.5 text-xs font-mono-data font-bold text-steel rounded-lg">
              <span className="text-mint flex items-center gap-1.5 font-black">
                <Zap className="h-3 w-3 fill-mint/20" />
                {symbols}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Section */}
      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[400px_1fr]">
        
        {/* Left Side: Control deck Form */}
        <aside>
          <form onSubmit={submit} className="rounded-2xl glass-panel p-6 shadow-panel border border-line space-y-5 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2 pb-3 border-b border-line">
              <SlidersHorizontal className="h-4 w-4 text-mint" aria-hidden />
              <h2 className="text-sm font-black uppercase tracking-wider text-ink">Research Settings</h2>
            </div>

            {/* Autocomplete Company Search */}
            <div className="relative relative-autocomplete">
              <label className="block text-xs font-bold uppercase tracking-wider text-steel" htmlFor="company-search">
                Quick Company Search
              </label>
              <div className="relative mt-2 flex items-center">
                <input
                  id="company-search"
                  type="text"
                  value={searchVal}
                  onChange={(event) => { setSearchVal(event.target.value); setSearchOpen(true); }}
                  onFocus={() => { if (searchVal.trim().length > 0) setSearchOpen(true); }}
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

              {/* Suggestions Dropdown — positioned relative to outer wrapper */}
              {searchOpen && searchVal.trim().length > 0 && (
                <div className="absolute left-0 right-0 z-[9999] mt-1 max-h-60 overflow-y-auto rounded-xl border border-line bg-slate-950/95 backdrop-blur-md p-1 shadow-2xl animate-fade-in divide-y divide-line/20">
                  {suggestions.length > 0 ? (
                    suggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.symbol}
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(suggestion); }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs rounded-lg transition-colors group ${
                          index === activeIndex
                            ? "bg-mint/10 text-mint"
                            : "text-steel hover:bg-mint/5 hover:text-mint"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className={`font-bold truncate group-hover:text-mint transition-colors ${
                            index === activeIndex ? "text-mint" : "text-ink"
                          }`}>
                            <HighlightedText text={suggestion.name} highlight={searchVal} />
                          </p>
                          <p className={`text-[10px] font-mono-data mt-0.5 ${
                            index === activeIndex ? "text-mint/70" : "text-steel/50"
                          }`}>
                            <HighlightedText text={suggestion.symbol.split(".")[0]} highlight={searchVal} />
                          </p>
                        </div>
                        <span className={`shrink-0 font-mono-data font-black text-[9px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${
                          index === activeIndex
                            ? "bg-mint/20 border-mint/30 text-mint"
                            : "bg-paper border-line text-steel/70"
                        }`}>
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



            {/* Clickable Quick Pills */}
            <div className="flex flex-wrap gap-1.5">
              {sampleQueries.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setQuery(sample)}
                  className={`border px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    query === sample
                      ? "border-mint bg-mint/5 text-mint"
                      : "border-line bg-paper/30 hover:border-mint hover:bg-mint/5 text-steel"
                  }`}
                >
                  {sample}
                </button>
              ))}
            </div>

            {/* Parameters Row */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-steel mb-2" htmlFor="risk">
                  Risk Tolerance
                </label>
                <select
                  id="risk"
                  value={riskTolerance}
                  onChange={(event) => setRiskTolerance(event.target.value as "low" | "medium" | "high")}
                  className="h-10 w-full border border-line bg-terminalBg/60 px-3 text-xs font-bold text-ink outline-none rounded-lg transition-colors focus:border-mint"
                >
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-steel mb-2" htmlFor="horizon">
                  Investment Horizon
                </label>
                <select
                  id="horizon"
                  value={horizon}
                  onChange={(event) => setHorizon(event.target.value as "short" | "medium" | "long")}
                  className="h-10 w-full border border-line bg-terminalBg/60 px-3 text-xs font-bold text-ink outline-none rounded-lg transition-colors focus:border-mint"
                >
                  <option value="short">Short Term</option>
                  <option value="medium">Medium Term</option>
                  <option value="long">Long Term</option>
                </select>
              </div>
            </div>

            {/* Portfolio Context */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-steel" htmlFor="portfolio">
                Client Portfolio Context (Optional)
              </label>
              <textarea
                id="portfolio"
                value={portfolioContext}
                onChange={(event) => setPortfolioContext(event.target.value)}
                placeholder="Example: Currently overweight tech; looking for defensive or small-cap setups."
                className="mt-2 min-h-20 w-full resize-none border border-line bg-terminalBg/40 px-4 py-3 text-xs text-ink outline-none rounded-xl transition-all focus:border-mint focus:ring-1 focus:ring-mint/20 placeholder-steel/40"
              />
            </div>

            {/* Run Button */}
            <button
              type="submit"
              disabled={loading || query.trim().length < 2}
              className="relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden bg-mint font-black text-white dark:text-slate-950 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(8,153,129,0.35)] hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span className="text-xs uppercase tracking-widest font-black">Executing Pipeline…</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden />
                  <span className="text-xs uppercase tracking-widest font-black">Analyze Now</span>
                </>
              )}
            </button>

            {error && (
              <div className="border border-berry/30 bg-berry/10 p-3.5 text-xs font-semibold text-berry rounded-xl animate-fade-in leading-relaxed">
                {error}
              </div>
            )}
          </form>
        </aside>

        {/* Right Side: Dynamic Content Panel */}
        <div className="rounded-2xl glass-panel-heavy p-6 shadow-panel border border-line flex flex-col justify-between min-h-[520px]">
          
          {/* Loading Timeline Mode */}
          {loading ? (
            <div className="flex h-full min-h-[480px] flex-col justify-center items-center py-6 animate-fade-in">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-mint bg-mint/5 border border-mint/10 px-3 py-1 rounded-full animate-pulse">
                Orchestrating Sub-Agents
              </span>
              <h3 className="text-lg font-bold text-ink mb-6 text-center">
                AI Research Pipeline
              </h3>
              
              <div className="w-full max-w-md space-y-3">
                {agentSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === activeAgent;
                  const isDone = index < activeAgent;
                  
                  return (
                    <div
                      key={step.name}
                      className={`flex items-center gap-3.5 border p-3.5 rounded-xl transition-all duration-300 ${
                        isActive
                          ? "border-mint/30 bg-mint/5 shadow-[0_0_15px_rgba(8,153,129,0.06)]"
                          : isDone
                            ? "border-line bg-paper/40 opacity-70"
                            : "border-line/30 bg-paper/10 opacity-30"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 border transition-colors ${
                        isActive 
                          ? "bg-mint/10 border-mint/20 text-mint" 
                          : isDone 
                            ? "bg-paper border-line text-mint" 
                            : "bg-paper/30 border-line/30 text-steel/30"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-bold uppercase tracking-wider ${isActive ? "text-ink" : "text-steel/70"}`}>
                            {step.name}
                          </p>
                          {isActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-mint animate-ping" />
                          )}
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
                <div className="h-1 w-full overflow-hidden rounded-full bg-line/20 border border-line/10">
                  <div
                    className="h-full bg-gradient-to-r from-mint to-indigo-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((activeAgent + 1) / agentSteps.length) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2.5 text-[10px] font-mono-data font-bold text-steel/50">
                  <span>STAGE: {activeAgent + 1} / {agentSteps.length}</span>
                  <span>{Math.round(((activeAgent + 1) / agentSteps.length) * 100)}% COMPILED</span>
                </div>
              </div>
            </div>
          ) : result ? (
            
            /* Results Display Mode */
            <div className="space-y-6 animate-fade-in-up w-full">
              {/* Committee Summary banner */}
              <div className="border border-line bg-paper p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 w-64 h-64 rounded-full bg-gradient-to-bl from-mint/10 to-transparent blur-3xl" />
                <p className="text-[10px] font-black uppercase tracking-widest text-mint bg-mint/5 px-2.5 py-0.5 rounded border border-mint/10 inline-block">
                  AI Research Verdict
                </p>
                <h3 className="mt-3 text-lg font-bold tracking-tight text-ink leading-relaxed">
                  {formatCurrencySymbols(result.summary, result.analyses[0]?.symbol, result.analyses[0]?.currency)}
                </h3>
                <p className="mt-4 text-[11px] font-medium text-steel/60 leading-relaxed border-t border-line pt-3">
                  Disclaimer: {result.disclaimer}
                </p>
              </div>

              {/* Individual Reports render */}
              <div className="space-y-6">
                {result.analyses.map((analysis) => (
                  <AnalysisReport key={analysis.symbol} analysis={analysis} />
                ))}
              </div>
            </div>
          ) : (
            
            /* Landing Initial Mode */
            <div className="flex h-full min-h-[480px] flex-col justify-center items-center text-center p-6 animate-fade-in">
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
              <p className="mt-3 max-w-sm text-xs font-medium text-steel leading-relaxed">
                Input any ticker or stock query to launch six collaborative AI sub-agents. 
                They scan market financials, recent news headlines, retail sentiment charts, and sizing portfolios.
              </p>
              
              <div className="mt-8 grid gap-4 grid-cols-2 max-w-sm w-full text-left">
                <div className="p-3 bg-paper/40 border border-line rounded-xl">
                  <div className="text-mint font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Real-time
                  </div>
                  <p className="text-[11px] text-steel/60 leading-relaxed">Live yfinance market feeds and news web crawls.</p>
                </div>
                <div className="p-3 bg-paper/40 border border-line rounded-xl">
                  <div className="text-indigo-500 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Consensus
                  </div>
                  <p className="text-[11px] text-steel/60 leading-relaxed">Agents debate signals to form a final verdict.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
