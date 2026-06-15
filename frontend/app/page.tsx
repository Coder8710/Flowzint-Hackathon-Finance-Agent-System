"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Brain, Loader2, Newspaper, Search, Shield, SlidersHorizontal, TrendingUp } from "lucide-react";
import { analyzeStock } from "@/lib/api";
import { AnalysisResponse } from "@/lib/types";
import { AnalysisReport } from "@/components/AnalysisReport";

const sampleQueries = ["Analyze NVIDIA stock", "Compare Apple vs Microsoft", "Should I invest in Tesla?"];

const agentSteps = [
  { name: "News Agent", icon: Newspaper, desc: "Scanning latest headlines…" },
  { name: "Fundamental Agent", icon: BarChart3, desc: "Evaluating financials…" },
  { name: "Technical Agent", icon: TrendingUp, desc: "Analyzing price trends…" },
  { name: "Sentiment Agent", icon: Brain, desc: "Gauging market mood…" },
  { name: "Risk Agent", icon: Shield, desc: "Assessing volatility…" },
  { name: "Master Agent", icon: Activity, desc: "Synthesizing report…" },
];

export default function Home() {
  const [query, setQuery] = useState("Analyze NVIDIA stock");
  const [riskTolerance, setRiskTolerance] = useState<"low" | "medium" | "high">("medium");
  const [horizon, setHorizon] = useState<"short" | "medium" | "long">("medium");
  const [portfolioContext, setPortfolioContext] = useState("");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState(0);

  const symbols = useMemo(() => result?.symbols.join(" / ") ?? "Ready", [result]);

  // Simulate agent progress during loading
  useEffect(() => {
    if (!loading) {
      setActiveAgent(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveAgent((prev) => (prev < agentSteps.length - 1 ? prev + 1 : prev));
    }, 3000);
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
      setError(caught instanceof Error ? caught.message : "Unable to run analysis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-line bg-paper/95 backdrop-blur-sm animate-fade-in">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-mint tracking-wide">Flowzint Finance AI</p>
            <h1 className="break-words text-2xl font-bold tracking-tight text-ink">
              Multi-agent stock analysis console
            </h1>
          </div>
          <div className="flex h-10 items-center gap-2 border border-line bg-white px-3 text-sm font-medium text-ink/70 animate-pulse-glow rounded-md">
            <Activity className="h-4 w-4 text-mint" aria-hidden />
            <span>{symbols}</span>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[420px_1fr] lg:px-6">
        <form onSubmit={submit} className="border border-line bg-white p-5 shadow-panel rounded-lg animate-fade-in-up">
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-steel" aria-hidden />
            <h2 className="text-base font-semibold text-ink">Ask the master agent</h2>
          </div>

          <label className="block text-sm font-medium text-ink/72" htmlFor="query">
            Query
          </label>
          <textarea
            id="query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 min-h-28 w-full resize-y border border-line bg-paper px-3 py-3 text-sm outline-none rounded-md transition-colors focus:border-mint focus:ring-1 focus:ring-mint/30"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {sampleQueries.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setQuery(sample)}
                className="border border-line bg-paper px-3 py-2 text-xs font-medium text-ink/70 rounded-md transition-all hover:border-mint hover:text-mint hover:bg-mint/5"
              >
                {sample}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-ink/72" htmlFor="risk">
                Risk tolerance
              </label>
              <select
                id="risk"
                value={riskTolerance}
                onChange={(event) => setRiskTolerance(event.target.value as "low" | "medium" | "high")}
                className="h-11 w-full border border-line bg-paper px-3 text-sm outline-none rounded-md transition-colors focus:border-mint focus:ring-1 focus:ring-mint/30"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink/72" htmlFor="horizon">
                Horizon
              </label>
              <select
                id="horizon"
                value={horizon}
                onChange={(event) => setHorizon(event.target.value as "short" | "medium" | "long")}
                className="h-11 w-full border border-line bg-paper px-3 text-sm outline-none rounded-md transition-colors focus:border-mint focus:ring-1 focus:ring-mint/30"
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>
          </div>

          <label className="mt-5 block text-sm font-medium text-ink/72" htmlFor="portfolio">
            Portfolio context
          </label>
          <textarea
            id="portfolio"
            value={portfolioContext}
            onChange={(event) => setPortfolioContext(event.target.value)}
            placeholder="Example: I already hold large-cap tech and want lower drawdown."
            className="mt-2 min-h-24 w-full resize-y border border-line bg-paper px-3 py-3 text-sm outline-none rounded-md transition-colors focus:border-mint focus:ring-1 focus:ring-mint/30"
          />

          <button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-ink px-4 text-sm font-semibold text-white rounded-lg transition-all hover:bg-steel hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <SlidersHorizontal className="h-4 w-4" aria-hidden />}
            {loading ? "Analyzing…" : "Run analysis"}
          </button>

          {error ? (
            <p className="mt-4 border border-berry bg-berry/10 p-3 text-sm text-berry rounded-md animate-fade-in">
              {error}
            </p>
          ) : null}
        </form>

        <div className="min-h-[520px] border border-line bg-paper/80 p-5 rounded-lg">
          {loading ? (
            <div className="flex h-full min-h-[480px] flex-col justify-center items-center p-6 animate-fade-in">
              <p className="text-sm font-semibold uppercase tracking-wider text-steel mb-6">
                AI Agents Working
              </p>
              <div className="w-full max-w-sm space-y-3">
                {agentSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === activeAgent;
                  const isDone = index < activeAgent;
                  return (
                    <div
                      key={step.name}
                      className={`flex items-center gap-3 border p-3 rounded-md transition-all duration-300 ${
                        isActive
                          ? "border-mint bg-mint/5 shadow-sm"
                          : isDone
                            ? "border-line bg-white/60 opacity-70"
                            : "border-line/50 bg-white/30 opacity-40"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? "text-mint animate-pulse" : isDone ? "text-mint" : "text-ink/30"
                        }`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${isActive ? "text-ink" : "text-ink/50"}`}>
                          {step.name}
                        </p>
                        <p className={`text-xs ${isActive ? "text-ink/60" : "text-ink/30"}`}>
                          {isDone ? "Complete ✓" : isActive ? step.desc : "Waiting…"}
                        </p>
                      </div>
                      {isActive && (
                        <Loader2 className="h-3.5 w-3.5 text-mint animate-spin shrink-0" aria-hidden />
                      )}
                      {isDone && (
                        <span className="text-xs font-semibold text-mint">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 w-full max-w-sm">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full bg-mint rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((activeAgent + 1) / agentSteps.length) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-ink/50">
                  {activeAgent + 1} of {agentSteps.length} agents
                </p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4 animate-fade-in-up">
              <div className="border border-line bg-white p-5 rounded-lg">
                <p className="text-sm font-semibold uppercase tracking-wider text-steel">Master Agent Summary</p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-ink">{result.summary}</h2>
                <p className="mt-3 text-sm text-ink/60">{result.disclaimer}</p>
              </div>
              <div className="space-y-5">
                {result.analyses.map((analysis) => (
                  <AnalysisReport key={analysis.symbol} analysis={analysis} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[480px] flex-col justify-center border border-dashed border-line bg-white/70 p-6 rounded-lg animate-fade-in">
              <p className="text-sm font-semibold uppercase tracking-wider text-steel">Awaiting query</p>
              <h2 className="mt-2 max-w-2xl text-2xl font-bold tracking-tight text-ink">
                Ask for a stock analysis or comparison and the master agent will coordinate six specialist agents.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-ink/62">
                Results include a buy, hold, or sell suggestion, agent-level evidence, risk score, recent headlines, and portfolio-fit notes.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
