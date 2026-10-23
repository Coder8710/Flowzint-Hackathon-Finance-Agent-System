"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnalysisRequest, AnalysisResponse } from "@/lib/types";
import { analyzeStock } from "@/lib/api";

interface AnalysisContextValue {
  result: AnalysisResponse | null;
  loading: boolean;
  error: string;
  lastRequest: AnalysisRequest | null;
  theme: "light" | "dark";
  isHydrated: boolean;
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;
  runAnalysis: (req: AnalysisRequest) => Promise<void>;
  ensureAnalysis: (symbol: string) => Promise<void>;
  clearResult: () => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastRequest, setLastRequest] = useState<AnalysisRequest | null>(null);
  const [theme, setThemeState] = useState<"light" | "dark">("dark");
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = sessionStorage.getItem("stockmaster_analysis_result");
      if (stored) {
        setResult(JSON.parse(stored));
      }
      const storedReq = sessionStorage.getItem("stockmaster_last_request");
      if (storedReq) {
        setLastRequest(JSON.parse(storedReq));
      }
      const storedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
      if (storedTheme) {
        setThemeState(storedTheme);
        document.documentElement.classList.toggle("dark", storedTheme === "dark");
      }
    } catch {
      // Ignore parse errors
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const setTheme = useCallback((t: "light" | "dark") => {
    setThemeState(t);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", t);
      document.documentElement.classList.toggle("dark", t === "dark");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
      }
      return next;
    });
  }, []);

  const runAnalysis = useCallback(async (req: AnalysisRequest) => {
    setLoading(true);
    setError("");
    setLastRequest(req);
    try {
      const response = await analyzeStock(req);
      setResult(response);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("stockmaster_analysis_result", JSON.stringify(response));
        sessionStorage.setItem("stockmaster_last_request", JSON.stringify(req));
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to run analysis. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Ensures data is loaded for the requested symbol without re-running if already in memory
  const ensureAnalysis = useCallback(
    async (symbol: string) => {
      const cleanSym = symbol.split(".")[0].toUpperCase();
      if (result) {
        const hasSymbol = result.analyses.some(
          (a) => a.symbol.split(".")[0].toUpperCase() === cleanSym
        );
        if (hasSymbol) return;
      }
      await runAnalysis({
        query: cleanSym,
        symbol: cleanSym,
        risk_tolerance: "medium",
        horizon: "medium",
      });
    },
    [result, runAnalysis]
  );

  const clearResult = useCallback(() => {
    setResult(null);
    setError("");
    setLastRequest(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("stockmaster_analysis_result");
      sessionStorage.removeItem("stockmaster_last_request");
    }
  }, []);

  return (
    <AnalysisContext.Provider
      value={{
        result,
        loading,
        error,
        lastRequest,
        theme,
        isHydrated,
        setTheme,
        toggleTheme,
        runAnalysis,
        ensureAnalysis,
        clearResult,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used within AnalysisProvider");
  return ctx;
}
