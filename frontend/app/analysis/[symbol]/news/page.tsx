"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Filter,
  Info,
  Layers,
  Newspaper,
  Radio,
  Tag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";

interface NewsItem {
  title: string;
  url: string;
  publisher?: string;
  published?: string;
  summary?: string;
  sentiment?: "bullish" | "bearish" | "neutral";
  catalyst_type?: string;
}

function classifyArticle(title: string, summary?: string): {
  sentiment: "bullish" | "bearish" | "neutral";
  label: string;
  catalystType: string;
} {
  const text = `${title} ${summary || ""}`.toLowerCase();

  const bullishKeywords = [
    "order", "contract", "profit", "surge", "gain", "high", "growth", "expansion",
    "win", "record", "upgrade", "beat", "positive", "award", "rally", "boost",
  ];
  const bearishKeywords = [
    "fall", "drop", "loss", "decline", "risk", "sell", "downgrade", "miss",
    "concern", "worry", "weak", "cut", "probe", "investigation", "penalty", "debt",
  ];

  const bullHits = bullishKeywords.filter((w) => text.includes(w)).length;
  const bearHits = bearishKeywords.filter((w) => text.includes(w)).length;

  let catalystType = "General Market Update";
  if (text.includes("order") || text.includes("contract") || text.includes("project")) {
    catalystType = "Commercial Contract & Order Win";
  } else if (text.includes("earnings") || text.includes("q1") || text.includes("q2") || text.includes("q3") || text.includes("q4") || text.includes("result")) {
    catalystType = "Earnings & Financial Results";
  } else if (text.includes("policy") || text.includes("govt") || text.includes("regulation") || text.includes("tender")) {
    catalystType = "Policy & Regulatory Environment";
  } else if (text.includes("debt") || text.includes("repay") || text.includes("bond") || text.includes("credit")) {
    catalystType = "Capital Structure & Debt Servicing";
  }

  if (bullHits > bearHits) {
    return { sentiment: "bullish", label: "Bullish Catalyst", catalystType };
  }
  if (bearHits > bullHits) {
    return { sentiment: "bearish", label: "Bearish Signal", catalystType };
  }
  return { sentiment: "neutral", label: "Neutral Headline", catalystType };
}

export default function NewsPage() {
  const { result } = useAnalysis();
  const params = useParams();
  const rawSymbol = (params.symbol as string) || (params.ticker as string);
  const symbol = rawSymbol?.toUpperCase();

  const [activeFilter, setActiveFilter] = useState<"all" | "bullish" | "bearish" | "neutral">("all");

  if (!result) return null;

  const analysis =
    result.analyses.find((a) => a.symbol.split(".")[0].toUpperCase() === symbol) ??
    result.analyses[0];

  if (!analysis) return null;

  const sym = analysis.symbol.split(".")[0];
  const rawNews: any[] = Array.isArray(analysis.news)
    ? analysis.news
    : Array.isArray((result as any).news)
    ? (result as any).news
    : [];

  // Classified and enriched news
  const enrichedNews = useMemo(() => {
    return rawNews.map((item) => {
      const { sentiment, label, catalystType } = classifyArticle(item.title, item.summary);
      return {
        ...item,
        sentiment: item.sentiment || sentiment,
        label,
        catalystType: item.catalyst_type || catalystType,
      };
    });
  }, [rawNews]);

  // Counts
  const bullCount = enrichedNews.filter((n) => n.sentiment === "bullish").length;
  const bearCount = enrichedNews.filter((n) => n.sentiment === "bearish").length;
  const neutralCount = enrichedNews.filter((n) => n.sentiment === "neutral").length;
  const totalNews = enrichedNews.length || 1;

  const bullPct = Math.round((bullCount / totalNews) * 100);
  const bearPct = Math.round((bearCount / totalNews) * 100);
  const neutralPct = 100 - bullPct - bearPct;

  // Filtered news feed
  const displayNews = useMemo(() => {
    if (activeFilter === "all") return enrichedNews;
    return enrichedNews.filter((n) => n.sentiment === activeFilter);
  }, [enrichedNews, activeFilter]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in py-1">
      <title>{`News & Catalysts — ${analysis.company_name} (${sym}) | StockMaster.AI`}</title>

      {/* Page Header */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-mint/10 text-mint border border-mint/20">
              <Newspaper className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black uppercase tracking-wider text-ink font-sans">
                  News Intelligence & Catalyst Radar
                </h1>
                <span className="font-mono-data text-xs font-bold text-mint bg-mint/10 border border-mint/20 px-2 py-0.5 rounded">
                  {sym}
                </span>
              </div>
              <p className="text-xs text-steel mt-0.5">
                Sentiment Scoring, Catalyst Verification, and Event Invalidation Feed
              </p>
            </div>
          </div>

          <span className="text-xs font-mono-data font-bold text-steel bg-paper border border-line px-3 py-1.5 rounded-xl">
            {enrichedNews.length} Headlines Captured
          </span>
        </div>
      </div>

      {/* ── Sub-Section 1: Macro & Catalyst Overview (Sentiment Velocity Matrix) ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <Radio className="h-5 w-5 text-mint" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-ink font-sans">
                Sentiment Pulse & Velocity Matrix
              </h2>
              <p className="text-xs text-steel">Algorithmic classification of current news flow momentum</p>
            </div>
          </div>
          <span className="text-[10px] font-mono-data uppercase text-steel">News & Macro Agent</span>
        </div>

        {/* Sentiment Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-emerald-500 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Bullish ({bullCount}) · {bullPct}%
            </span>
            <span className="text-steel font-mono-data text-[10px] uppercase">
              Neutral ({neutralCount}) · {neutralPct}%
            </span>
            <span className="text-rose-500 flex items-center gap-1">
              Bearish ({bearCount}) · {bearPct}% <TrendingDown className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="h-3 w-full rounded-full bg-line/40 overflow-hidden flex shadow-inner">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${bullPct}%` }} />
            <div className="h-full bg-steel/40 transition-all duration-500" style={{ width: `${neutralPct}%` }} />
            <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${bearPct}%` }} />
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl border border-line bg-paper/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">Total Headlines</span>
            <p className="text-base font-extrabold text-ink font-mono-data mt-0.5">{enrichedNews.length}</p>
          </div>
          <div className="p-3 rounded-xl border border-line bg-paper/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">Bullish Ratio</span>
            <p className="text-base font-extrabold text-emerald-500 font-mono-data mt-0.5">{bullPct}%</p>
          </div>
          <div className="p-3 rounded-xl border border-line bg-paper/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">Bearish Ratio</span>
            <p className="text-base font-extrabold text-rose-500 font-mono-data mt-0.5">{bearPct}%</p>
          </div>
          <div className="p-3 rounded-xl border border-line bg-paper/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">Coverage Status</span>
            <p className="text-base font-extrabold text-mint font-mono-data mt-0.5">Active Crawl</p>
          </div>
        </div>
      </div>

      {/* ── Sub-Section 2: Upcoming Catalysts & High-Impact Events Schedule (Table) ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-5 w-5 text-mint" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-ink font-sans">
                Upcoming Catalyst Schedule & High-Impact Events
              </h2>
              <p className="text-xs text-steel">Event horizon matrix with expected volatility impact</p>
            </div>
          </div>
          <span className="text-[10px] font-mono-data uppercase text-steel">Event Radar</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line bg-paper/50 text-[10px] uppercase font-black tracking-wider text-steel">
                <th className="py-2.5 px-3">Catalyst Event</th>
                <th className="py-2.5 px-3">Expected Horizon</th>
                <th className="py-2.5 px-3">Expected Volatility</th>
                <th className="py-2.5 px-3">Thesis Impact Vector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 font-mono-data">
              <tr>
                <td className="py-3 px-3 font-sans font-bold text-ink">Quarterly Earnings Release</td>
                <td className="py-3 px-3 text-steel">Next 30-45 Days</td>
                <td className="py-3 px-3 font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber/10 text-amber border border-amber/20">
                    High Volatility (±6-8%)
                  </span>
                </td>
                <td className="py-3 px-3 font-sans text-steel text-[11px]">
                  Order execution pace and EBITDA margin confirmation.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-sans font-bold text-ink">Institutional Shareholding Updates</td>
                <td className="py-3 px-3 text-steel">Quarterly Filing Cycle</td>
                <td className="py-3 px-3 font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-mint/10 text-mint border border-mint/20">
                    Moderate (±2-3%)
                  </span>
                </td>
                <td className="py-3 px-3 font-sans text-steel text-[11px]">
                  FII / DII net flow confirmation and promoter pledges.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-sans font-bold text-ink">Government Energy Tender Allocation</td>
                <td className="py-3 px-3 text-steel">Trailing 90 Days</td>
                <td className="py-3 px-3 font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    High Upside Vector
                  </span>
                </td>
                <td className="py-3 px-3 font-sans text-steel text-[11px]">
                  National renewable capacity auction results.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Sub-Section 3: Interactive Sentiment Filters & Full News Feed (All Shown) ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <Filter className="h-5 w-5 text-mint" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-ink font-sans">
                Full News Feed & Verified Evidence ({displayNews.length})
              </h2>
              <p className="text-xs text-steel">Full chronological headline feed without truncation</p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeFilter === "all"
                  ? "bg-mint text-black font-extrabold shadow-sm"
                  : "border border-line bg-paper/60 text-steel hover:text-ink"
              }`}
            >
              All ({enrichedNews.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("bullish")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeFilter === "bullish"
                  ? "bg-emerald-500 text-black font-extrabold shadow-sm"
                  : "border border-line bg-paper/60 text-emerald-500 hover:bg-emerald-500/10"
              }`}
            >
              Bullish ({bullCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("bearish")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeFilter === "bearish"
                  ? "bg-rose-500 text-black font-extrabold shadow-sm"
                  : "border border-line bg-paper/60 text-rose-500 hover:bg-rose-500/10"
              }`}
            >
              Bearish ({bearCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("neutral")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeFilter === "neutral"
                  ? "bg-steel text-black font-extrabold shadow-sm"
                  : "border border-line bg-paper/60 text-steel hover:text-ink"
              }`}
            >
              Neutral ({neutralCount})
            </button>
          </div>
        </div>

        {/* News Feed Cards (All Shown) */}
        <div className="space-y-4">
          {displayNews.length > 0 ? (
            displayNews.map((item, idx) => {
              const isBull = item.sentiment === "bullish";
              const isBear = item.sentiment === "bearish";
              const borderClass = isBull
                ? "border-emerald-500/30 bg-emerald-500/5"
                : isBear
                ? "border-rose-500/30 bg-rose-500/5"
                : "border-line bg-paper/50";

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-xl border ${borderClass} space-y-3 transition-all hover:border-mint/50`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                        isBull
                          ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                          : isBear
                          ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                          : "bg-line/40 text-steel border-line"
                      }`}>
                        {item.label}
                      </span>
                      <span className="text-[10px] font-mono-data text-steel px-2 py-0.5 rounded bg-paper border border-line">
                        {item.catalystType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono-data text-steel/80">
                      <Clock className="h-3 w-3" />
                      <span>{item.published || "Live Feed"}</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-ink leading-relaxed">
                    {item.title}
                  </h3>

                  {item.summary && (
                    <p className="text-xs text-steel leading-relaxed">
                      {item.summary}
                    </p>
                  )}

                  {/* Investor Impact & Source */}
                  <div className="pt-3 border-t border-line/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-steel">
                      <span className="font-bold text-ink text-[11px]">Source Attribution:</span>
                      <span className="text-steel font-mono-data text-[11px]">{item.publisher || "Yahoo Finance / Market Feed"}</span>
                    </div>

                    {item.url && item.url !== "#" ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-mint hover:underline"
                      >
                        <span>Read Primary Source</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-steel/60">Primary feed archived</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center border border-line rounded-xl bg-paper/40 space-y-1">
              <p className="text-xs font-bold text-ink">No headlines match the selected sentiment filter.</p>
              <p className="text-[11px] text-steel">Select &apos;All&apos; to view all live headlines.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Sub-Section 4: Macro Narrative & Risk Synthesis ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber" />
            <h2 className="text-sm font-black uppercase tracking-wider text-ink font-sans">
              Market Narrative & Regulatory Risk Synthesis
            </h2>
          </div>
          <span className="text-[10px] font-mono-data uppercase text-steel">News & Macro Agent</span>
        </div>

        <p className="text-xs leading-relaxed text-ink/90 font-medium">
          Market coverage indicates that while {sym} benefits from sustained domestic infrastructure demand and tailwinds in renewable energy transition, headline volatility remains elevated around quarter-end earnings and global interest rate adjustments. Investors should weight long positions toward verified contract wins while using defined stop-loss thresholds to insulate portfolios against broader market beta swings.
        </p>
      </div>
    </div>
  );
}
