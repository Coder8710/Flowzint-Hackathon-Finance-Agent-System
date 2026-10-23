"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAnalysis } from "@/components/AnalysisContext";
import { AppShell } from "@/components/AppShell";
import { Loader2 } from "lucide-react";

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const rawSymbol = (params.symbol as string) || (params.ticker as string);
  const symbol = rawSymbol?.toUpperCase();
  const { result, loading, ensureAnalysis, isHydrated } = useAnalysis();

  useEffect(() => {
    if (!symbol || !isHydrated) return;
    ensureAnalysis(symbol);
  }, [symbol, isHydrated, ensureAnalysis]);

  return (
    <AppShell>
      {!result && loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4 animate-fade-in text-center">
          <Loader2 className="h-10 w-10 text-mint animate-spin" />
          <div className="space-y-1.5">
            <h3 className="text-sm font-black uppercase tracking-wider text-ink">
              Loading Analysis for {symbol}...
            </h3>
            <p className="text-xs text-steel max-w-sm">
              Gathering specialist intelligence from Fundamental, Technical, Sentiment, and Risk agents.
            </p>
          </div>
        </div>
      ) : (
        children
      )}
    </AppShell>
  );
}
