"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAnalysis } from "@/components/AnalysisContext";

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const rawSymbol = (params.symbol as string) || (params.ticker as string);
  const symbol = rawSymbol?.toUpperCase();
  const { ensureAnalysis, isHydrated } = useAnalysis();

  useEffect(() => {
    if (!symbol || !isHydrated) return;
    ensureAnalysis(symbol);
  }, [symbol, isHydrated, ensureAnalysis]);

  return <>{children}</>;
}
