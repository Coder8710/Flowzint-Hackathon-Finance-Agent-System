"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnalysisRequest, AnalysisResponse } from "@/lib/types";
import { analyzeStock, runDebate } from "@/lib/api";

interface AnalysisContextValue {
  result: AnalysisResponse | null;
  loading: boolean;
  error: string;
  debateLoading: boolean;
  debateError: string;
  lastRequest: AnalysisRequest | null;
  theme: "light" | "dark";
  isHydrated: boolean;
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;
  runAnalysis: (req: AnalysisRequest) => Promise<void>;
  loadDebate: (symbol: string) => Promise<void>;
  clearResult: () => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debateLoading, setDebateLoading] = useState(false);
  const [debateError, setDebateError] = useState("");
  const [lastRequest, setLastRequest] = useState<AnalysisRequest | null>(null);
  const [theme, setThemeState] = useState<"light" | "dark">("dark");
  const [isHydrated, setIsHydrated] = useState(false);
  const debateRequestRef = useRef<Promise<void> | null>(null);

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
    setDebateError("");
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

  const loadDebate = useCallback(async (symbol: string) => {
    if (debateRequestRef.current) return debateRequestRef.current;

    const analysis = result?.analyses.find(
      (item) => item.symbol.split(".")[0].toUpperCase() === symbol.split(".")[0].toUpperCase()
    );
    if (!analysis || analysis.debate) return;

    setDebateLoading(true);
    setDebateError("");
    const request = (async () => {
      try {
        const debate = await runDebate(analysis);
        setResult((previous) => {
          if (!previous) return previous;
          const updated = {
            ...previous,
            analyses: previous.analyses.map((item) => {
              if (item.symbol.split(".")[0].toUpperCase() !== analysis.symbol.split(".")[0].toUpperCase()) return item;
              return {
                ...item,
                debate,
                recommendation: (debate.verdict === "Neutral" ? "Hold" : debate.verdict) as "Buy" | "Hold" | "Sell",
                confidence: debate.confidence,
              };
            }),
          };
          if (typeof window !== "undefined") {
            sessionStorage.setItem("stockmaster_analysis_result", JSON.stringify(updated));
          }
          return updated;
        });
      } catch (caught) {
        setDebateError(
          caught instanceof Error ? caught.message : "Unable to load the debate. Please try again."
        );
      } finally {
        setDebateLoading(false);
      }
    })();
    debateRequestRef.current = request;
    try {
      await request;
    } finally {
      debateRequestRef.current = null;
    }
  }, [result]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError("");
    setLastRequest(null);
    setDebateError("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("stockmaster_analysis_result");
      sessionStorage.removeItem("stockmaster_last_request");
    }
  }, []);

  return (
    <AnalysisContext.Provider
      value={{ result, loading, error, debateLoading, debateError, lastRequest, theme, isHydrated, setTheme, toggleTheme, runAnalysis, loadDebate, clearResult }}
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
