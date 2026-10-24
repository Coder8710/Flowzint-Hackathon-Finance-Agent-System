"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";
import { AppShell } from "@/components/AppShell";
import { formatCurrencySymbols } from "@/lib/currency";

const PILLAR_CONFIG = [
  { icon: "💎", title: "Valuation & Intrinsic Value" },
  { icon: "🚀", title: "Growth Catalyst & Runway" },
  { icon: "📊", title: "Technical Setup & Levels" },
  { icon: "🏰", title: "Economic Moat & Peers" },
  { icon: "🛡️", title: "Risk vs Reward Ratio" },
  { icon: "🌐", title: "Macro & Sector Drivers" },
];

function PillarCard({
  index,
  text,
  symbol,
  currency,
}: {
  index: number;
  text: string;
  symbol: string;
  currency?: string;
}) {
  const [open, setOpen] = useState(false);
  const config = PILLAR_CONFIG[index] || { icon: "📌", title: `Strategic Pillar ${index + 1}` };

  const fullText = String(text ?? "").trim();
  const sentenceEnd = fullText.search(/[.!?]\s/);
  const previewEnd = sentenceEnd > 0 && sentenceEnd <= 220
    ? sentenceEnd + 1
    : fullText.length > 220
    ? fullText.lastIndexOf(" ", 220)
    : fullText.length;
  const preview = previewEnd > 0 && previewEnd < fullText.length
    ? `${fullText.slice(0, previewEnd).trimEnd()}…`
    : fullText;
  const detailId = `thesis-detail-${index}`;

  return (
    <div className="rounded-2xl glass-panel border border-line p-5 shadow-panel space-y-3 transition-all hover:border-mint/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint/10 border border-mint/20 text-lg">
            {config.icon}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-mint">
                Pillar {index + 1}
              </span>
              <span className="text-steel/40 text-[10px]">·</span>
              <span className="text-[10px] font-mono-data text-steel">
                {symbol}
              </span>
            </div>
            <h3 className="text-sm font-bold text-ink tracking-tight">
              {config.title}
            </h3>
          </div>
        </div>

        {preview !== fullText && (
          <button
            type="button"
            onClick={() => setOpen((isOpen) => !isOpen)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-line bg-paper/60 text-xs font-bold text-steel hover:text-ink hover:border-mint transition-colors"
            aria-expanded={open}
            aria-controls={detailId}
          >
            <span>{open ? "Hide details" : "Read full detail"}</span>
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      <div
        id={detailId}
        className="bg-paper/40 border border-line/60 rounded-xl p-3.5 text-xs font-medium text-ink leading-relaxed"
      >
        {formatCurrencySymbols(open ? fullText : preview, symbol, currency)}
      </div>
    </div>
  );
}

export default function ThesisPage() {
  const { result } = useAnalysis();
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string)?.toUpperCase();

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

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up py-2">
        <title>{`Investment Thesis — ${analysis.company_name} (${sym}) | Stockmaster.ai`}</title>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-steel">
          <Link href={base} className="text-mint hover:underline">
            Overview ({sym})
          </Link>
          <span>/</span>
          <span className="text-ink">Investment Thesis</span>
        </div>

        {/* Header */}
        <div className="rounded-2xl glass-panel p-6 border border-line shadow-panel flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-mint/10 text-mint border border-mint/20">
              <BookOpen className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-lg font-black uppercase tracking-wider text-ink">
                Investment Thesis
              </h1>
              <p className="text-xs text-steel mt-0.5">
                {analysis.company_name} · {sym} · {analysis.thesis.length} Analytical Pillars
              </p>
            </div>
          </div>
          <span className="text-xs font-mono-data font-bold text-mint bg-mint/10 border border-mint/20 px-3 py-1 rounded-lg">
            {analysis.recommendation}
          </span>
        </div>

        {/* Pillars list */}
        <div className="space-y-4">
          {analysis.thesis.map((item, idx) => (
            <PillarCard
              key={idx}
              index={idx}
              text={item}
              symbol={sym}
              currency={analysis.currency}
            />
          ))}
        </div>

        {/* Back link */}
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
