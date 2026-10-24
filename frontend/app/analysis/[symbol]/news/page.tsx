"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe, Newspaper } from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";
import { AppShell } from "@/components/AppShell";
import { formatCurrencySymbols } from "@/lib/currency";
import { NewsItem } from "@/lib/types";

function formatDate(raw?: string | null): string {
  if (!raw) return "";
  const date = new Date(raw);
  if (isNaN(date.getTime())) return raw.split("T")[0] ?? raw;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function NewsPage() {
  const { result } = useAnalysis();
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string)?.toUpperCase();
  const [filterSource, setFilterSource] = useState<string>("all");

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
  const news: NewsItem[] = analysis.news ?? [];

  const sources = useMemo(() => {
    const set = new Set(news.map((n) => n.source).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [news]);

  const filtered = filterSource === "all" ? news : news.filter((n) => n.source === filterSource);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up py-2">
        <title>{`News & Catalysts — ${analysis.company_name} (${sym}) | Stockmaster.ai`}</title>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-steel">
          <Link href={base} className="text-mint hover:underline">
            Overview ({sym})
          </Link>
          <span>/</span>
          <span className="text-ink">Scanned Catalyst Feeds</span>
        </div>

        {/* Header Card */}
        <div className="rounded-2xl glass-panel p-6 border border-line shadow-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-mint/10 text-mint border border-mint/20">
              <Newspaper className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-base font-black uppercase tracking-wider text-ink">
                Scanned Catalyst Feeds
              </h1>
              <p className="text-xs text-steel mt-0.5">
                {analysis.company_name} · {sym} · {news.length} Scanned Headlines & Filings
              </p>
            </div>
          </div>

          {/* Sources Filter */}
          {sources.length > 2 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {sources.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setFilterSource(src)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                    filterSource === src
                      ? "border-mint bg-mint/10 text-mint"
                      : "border-line bg-paper/30 text-steel hover:text-ink hover:border-mint"
                  }`}
                >
                  {src === "all" ? "All Sources" : src}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* News Feed List */}
        {filtered.length > 0 ? (
          <div className="space-y-3.5">
            {filtered.map((item, idx) => {
              const googleSearchUrl = `https://news.google.com/search?q=${encodeURIComponent(item.title + " " + sym)}`;
              const href = item.url ?? googleSearchUrl;

              return (
                <a
                  key={`${item.title}-${idx}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl glass-panel border border-line p-5 shadow-panel transition-all hover:border-mint/40 hover:shadow-[0_0_20px_rgba(8,153,129,0.08)] group"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono-data font-black text-mint bg-mint/10 border border-mint/20 px-2 py-0.5 rounded">
                        {item.source}
                      </span>
                      {item.published_at && (
                        <span className="text-[10px] text-steel font-mono-data">
                          {formatDate(item.published_at)}
                        </span>
                      )}
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-steel/50 group-hover:text-mint transition-colors" />
                  </div>

                  <h3 className="text-sm font-bold text-ink leading-snug group-hover:text-mint transition-colors">
                    {formatCurrencySymbols(item.title, sym, analysis.currency)}
                  </h3>

                  {item.summary && (
                    <p className="mt-2 text-xs text-steel leading-relaxed line-clamp-3 bg-paper/30 p-2.5 rounded-xl border border-line/40">
                      {formatCurrencySymbols(item.summary, sym, analysis.currency)}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-mint">
                    <span>Read Original Article</span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl glass-panel border border-line p-12 text-center text-steel text-xs">
            No recent catalysts found matching the selected filter.
          </div>
        )}

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
