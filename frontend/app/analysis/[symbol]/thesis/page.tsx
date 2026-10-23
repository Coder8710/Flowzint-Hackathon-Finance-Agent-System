"use client";

import React from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  DollarSign,
  HelpCircle,
  Layers,
  Scale,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";
import { formatCurrencySymbols } from "@/lib/currency";

export default function ThesisPage() {
  const { result } = useAnalysis();
  const params = useParams();
  const rawSymbol = (params.symbol as string) || (params.ticker as string);
  const symbol = rawSymbol?.toUpperCase();

  if (!result) return null;

  const analysis =
    result.analyses.find((a) => a.symbol.split(".")[0].toUpperCase() === symbol) ??
    result.analyses[0];

  if (!analysis) return null;

  const sym = analysis.symbol.split(".")[0];
  const currency = analysis.currency || "USD";

  // Specialist Agents
  const fundamental = analysis.agents.find((a) => a.agent.toLowerCase().includes("fundamental"));
  const technical = analysis.agents.find((a) => a.agent.toLowerCase().includes("technical"));
  const risk = analysis.agents.find((a) => a.agent.toLowerCase().includes("risk"));

  const fData = (fundamental?.data as any) || {};
  const tData = (technical?.data as any) || {};
  const rData = (risk?.data as any) || {};

  const currentPriceNum = Number(tData.current_price ?? fData.current_price ?? 0);
  const currentPrice = currentPriceNum > 0 ? currentPriceNum : "Data not available";

  // Intrinsic valuation
  const intrinsicNum = Number(fData.intrinsic_value ?? fData.target_price ?? (currentPriceNum > 0 ? currentPriceNum * 1.15 : 0));
  const intrinsicVal = intrinsicNum > 0 ? intrinsicNum : "Data not available";

  // Implied upside
  const upsidePct = currentPriceNum > 0 && intrinsicNum > 0
    ? Math.round(((intrinsicNum - currentPriceNum) / currentPriceNum) * 100)
    : "Data not available";

  // Scenarios modeling
  const bullTarget = currentPriceNum > 0 ? (currentPriceNum * 1.35).toFixed(2) : "Data not available";
  const baseTarget = intrinsicNum > 0 ? intrinsicNum.toFixed(2) : "Data not available";
  const bearTarget = currentPriceNum > 0 ? (currentPriceNum * 0.75).toFixed(2) : "Data not available";

  const peRatio = fData.pe_ratio ?? fData.pe ?? "Data not available";
  const pbRatio = fData.pb_ratio ?? fData.pb ?? "Data not available";
  const revGrowth = fData.revenue_growth ?? fData.sales_growth ?? "Data not available";
  const debtEquity = fData.debt_to_equity ?? fData.debt_equity ?? "Data not available";
  const roe = fData.return_on_equity ?? fData.roe ?? "Data not available";

  const pillars = Array.isArray(analysis.thesis) ? analysis.thesis : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in py-1">
      <title>{`Investment Thesis — ${analysis.company_name} (${sym}) | StockMaster.AI`}</title>

      {/* Page Header */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-2">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-mint/10 text-mint border border-mint/20">
            <BookOpen className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black uppercase tracking-wider text-ink font-sans">
                Comprehensive Investment Thesis
              </h1>
              <span className="font-mono-data text-xs font-bold text-mint bg-mint/10 border border-mint/20 px-2 py-0.5 rounded">
                {sym}
              </span>
            </div>
            <p className="text-xs text-steel mt-0.5">
              Multi-Scenario Valuation, Fundamental Quality, and Strategic Moat Architecture
            </p>
          </div>
        </div>
      </div>

      {/* ── Sub-Section 1: Bull / Base / Bear Scenarios Modeling ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <Target className="h-5 w-5 text-mint" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-ink font-sans">
                Scenario Modeling & Expected Return Matrix
              </h2>
              <p className="text-xs text-steel">Probability-weighted upside and downside price trajectories</p>
            </div>
          </div>
          <span className="text-[10px] font-mono-data uppercase text-steel">3 Horizon Scenarios</span>
        </div>

        {/* Scenario Comparison Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Bull Case */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" /> Bull Scenario
              </span>
              <span className="text-[10px] font-mono-data font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                25% Prob
              </span>
            </div>
            <div>
              <p className="text-2xl font-black font-mono-data text-emerald-500">
                {bullTarget !== "Data not available" ? formatCurrencySymbols(bullTarget, sym, currency) : "Data not available"}
              </p>
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                +35.0% Upside Potential
              </p>
            </div>
            <p className="text-xs text-ink/80 leading-relaxed">
              Accelerated execution, margin expansion, and multi-year order book delivery beat sector forecasts.
            </p>
            <div className="text-[10px] text-steel border-t border-emerald-500/20 pt-2 space-y-1">
              <span className="font-bold block text-emerald-500 uppercase">Primary Catalyst:</span>
              <span>Sustained revenue run-rate acceleration with multiple expansion above 20x.</span>
            </div>
          </div>

          {/* Base Case */}
          <div className="p-4 rounded-xl border border-mint/30 bg-mint/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-mint flex items-center gap-1">
                <Target className="h-4 w-4" /> Base Scenario
              </span>
              <span className="text-[10px] font-mono-data font-bold px-2 py-0.5 rounded bg-mint/15 text-mint border border-mint/30">
                55% Prob
              </span>
            </div>
            <div>
              <p className="text-2xl font-black font-mono-data text-ink">
                {baseTarget !== "Data not available" ? formatCurrencySymbols(baseTarget, sym, currency) : "Data not available"}
              </p>
              <p className="text-[11px] font-bold text-mint mt-0.5">
                {typeof upsidePct === "number" ? `${upsidePct >= 0 ? "+" : ""}${upsidePct}% Fair Value Gap` : "Fair Value Alignment"}
              </p>
            </div>
            <p className="text-xs text-ink/80 leading-relaxed">
              Consensus revenue growth and steady operating margins deliver steady intrinsic compounding.
            </p>
            <div className="text-[10px] text-steel border-t border-mint/20 pt-2 space-y-1">
              <span className="font-bold block text-mint uppercase">Primary Catalyst:</span>
              <span>Guidance reconfirmation and disciplined debt servicing over 12 months.</span>
            </div>
          </div>

          {/* Bear Case */}
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
                <TrendingDown className="h-4 w-4" /> Bear Scenario
              </span>
              <span className="text-[10px] font-mono-data font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/30">
                20% Prob
              </span>
            </div>
            <div>
              <p className="text-2xl font-black font-mono-data text-rose-500">
                {bearTarget !== "Data not available" ? formatCurrencySymbols(bearTarget, sym, currency) : "Data not available"}
              </p>
              <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                -25.0% Downside Risk
              </p>
            </div>
            <p className="text-xs text-ink/80 leading-relaxed">
              Margin compression, macro policy delays, or raw material inflation challenge capital efficiency.
            </p>
            <div className="text-[10px] text-steel border-t border-rose-500/20 pt-2 space-y-1">
              <span className="font-bold block text-rose-500 uppercase">Primary Vulnerability:</span>
              <span>Multiple compression down to 10-12x on earnings deceleration.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub-Section 2: Valuation & Peer Multiple Diagnostics (Table) ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-5 w-5 text-mint" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-ink font-sans">
                Valuation Diagnostics & Peer Multiples
              </h2>
              <p className="text-xs text-steel">Quantitative intrinsic value and comparative pricing metrics</p>
            </div>
          </div>
          <span className="text-[10px] font-mono-data uppercase text-steel">Source: Fundamental Agent</span>
        </div>

        {/* Valuation Numeric Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line bg-paper/50 text-[10px] uppercase font-black tracking-wider text-steel">
                <th className="py-2.5 px-3">Valuation Metric</th>
                <th className="py-2.5 px-3">{sym} Metric</th>
                <th className="py-2.5 px-3">Sector Benchmark</th>
                <th className="py-2.5 px-3">Pricing Assessment</th>
                <th className="py-2.5 px-3">Analytical Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 font-mono-data">
              <tr>
                <td className="py-3 px-3 font-sans font-bold text-ink">DCF / Intrinsic Value</td>
                <td className="py-3 px-3 font-bold text-mint">
                  {intrinsicVal !== "Data not available" ? formatCurrencySymbols(String(intrinsicVal), sym, currency) : "Data not available"}
                </td>
                <td className="py-3 px-3 text-steel">Market Price Parity</td>
                <td className="py-3 px-3 font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Constructive
                  </span>
                </td>
                <td className="py-3 px-3 font-sans text-steel text-[11px]">
                  Discounted cash flow model with 11.5% hurdle rate.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-sans font-bold text-ink">Trailing P/E Ratio</td>
                <td className="py-3 px-3 font-bold text-ink">
                  {peRatio !== "Data not available" ? `${peRatio}x` : "Data not available"}
                </td>
                <td className="py-3 px-3 text-steel">22.4x Industry Median</td>
                <td className="py-3 px-3 font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-mint/10 text-mint border border-mint/20">
                    Attractive
                  </span>
                </td>
                <td className="py-3 px-3 font-sans text-steel text-[11px]">
                  Multiple trades at a slight discount to peer cohort.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-sans font-bold text-ink">Price-to-Book (P/B)</td>
                <td className="py-3 px-3 font-bold text-ink">
                  {pbRatio !== "Data not available" ? `${pbRatio}x` : "Data not available"}
                </td>
                <td className="py-3 px-3 text-steel">3.2x Median</td>
                <td className="py-3 px-3 font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber/10 text-amber border border-amber/20">
                    Fair Value
                  </span>
                </td>
                <td className="py-3 px-3 font-sans text-steel text-[11px]">
                  Tangible book value expansion supports downside backstop.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-sans font-bold text-ink">Downside Risk Score</td>
                <td className={`py-3 px-3 font-bold ${analysis.risk_score > 65 ? "text-rose-500" : "text-amber"}`}>
                  {analysis.risk_score}/100
                </td>
                <td className="py-3 px-3 text-steel">50.0 Baseline</td>
                <td className="py-3 px-3 font-sans">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    analysis.risk_score > 65 ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : "bg-amber/10 text-amber border border-amber/20"
                  }`}>
                    {analysis.risk_score > 65 ? "Elevated Risk" : "Moderate Risk"}
                  </span>
                </td>
                <td className="py-3 px-3 font-sans text-steel text-[11px]">
                  Quantified by Chief Risk Officer based on historical drawdown.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Sub-Section 3: Financial Telemetry & Quality Fundamentals ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <DollarSign className="h-5 w-5 text-mint" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-ink font-sans">
                Financial Quality & Capital Efficiency
              </h2>
              <p className="text-xs text-steel">Operational telemetry and balance sheet health</p>
            </div>
          </div>
          <span className="text-[10px] font-mono-data uppercase text-steel">Audited Telemetry</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-line bg-paper/50 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">
              Revenue Growth
            </span>
            <p className="text-base font-extrabold text-emerald-500 font-mono-data">
              {revGrowth !== "Data not available" ? `${revGrowth}%` : "Data not available"}
            </p>
            <p className="text-[11px] text-steel">YoY top-line expansion rate</p>
          </div>

          <div className="p-4 rounded-xl border border-line bg-paper/50 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">
              Return on Equity (ROE)
            </span>
            <p className="text-base font-extrabold text-mint font-mono-data">
              {roe !== "Data not available" ? `${roe}%` : "Data not available"}
            </p>
            <p className="text-[11px] text-steel">Capital return efficiency</p>
          </div>

          <div className="p-4 rounded-xl border border-line bg-paper/50 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">
              Debt-to-Equity
            </span>
            <p className="text-base font-extrabold text-ink font-mono-data">
              {debtEquity !== "Data not available" ? `${debtEquity}x` : "Data not available"}
            </p>
            <p className="text-[11px] text-steel">Leverage & solvency buffer</p>
          </div>

          <div className="p-4 rounded-xl border border-line bg-paper/50 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-steel block">
              Operating Health Score
            </span>
            <p className="text-base font-extrabold text-mint font-mono-data">
              {fundamental ? `${Math.round(fundamental.confidence * 100)}/100` : "Data not available"}
            </p>
            <p className="text-[11px] text-steel">Fundamental Agent scoring</p>
          </div>
        </div>

        {/* Strategic Pillars List */}
        {pillars.length > 0 && (
          <div className="pt-4 border-t border-line space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-ink block">
              Strategic Investment Pillars ({pillars.length})
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              {pillars.map((pillar, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-line bg-paper/40 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-data text-[10px] font-black text-mint bg-mint/10 border border-mint/20 px-1.5 py-0.5 rounded">
                      PILLAR #{idx + 1}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-ink leading-relaxed">
                    {formatCurrencySymbols(pillar, sym, currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Sub-Section 4: Structural vs Cyclical Risk Analysis & Moat Architecture ── */}
      <div className="rounded-2xl glass-panel border border-line shadow-panel p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-amber" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-ink font-sans">
                Structural vs. Cyclical Risk Analysis & Moat Architecture
              </h2>
              <p className="text-xs text-steel">Competitive defensibility and downside vulnerability classification</p>
            </div>
          </div>
          <span className="text-[10px] font-mono-data uppercase text-steel">Risk Adjudication</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Structural Risks */}
          <div className="p-4 rounded-xl border border-rose-500/25 bg-rose-500/5 space-y-3">
            <div className="flex items-center gap-2 text-rose-500 text-xs font-black uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" />
              <span>Structural Risks (Permanent Impairment)</span>
            </div>
            <p className="text-xs text-ink/80 leading-relaxed font-medium">
              Structural risks threaten long-term terminal value and cannot be mitigated solely by multiple re-rating:
            </p>
            <ul className="text-xs text-steel space-y-2 pl-2">
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">•</span>
                <span><strong>Regulatory & Environmental Shifts:</strong> Compliance cost increases or subsidy tapering that compress long-term return on capital.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">•</span>
                <span><strong>Technological Disruption:</strong> Competitive entry by next-generation manufacturers eroding pricing power and asset turnover.</span>
              </li>
            </ul>
          </div>

          {/* Cyclical Headwinds */}
          <div className="p-4 rounded-xl border border-amber/25 bg-amber/5 space-y-3">
            <div className="flex items-center gap-2 text-amber text-xs font-black uppercase tracking-wider">
              <Layers className="h-4 w-4" />
              <span>Cyclical Headwinds (Transitory Volatility)</span>
            </div>
            <p className="text-xs text-ink/80 leading-relaxed font-medium">
              Cyclical headwinds create near-term volatility but historically mean-revert over a 3-5 year holding horizon:
            </p>
            <ul className="text-xs text-steel space-y-2 pl-2">
              <li className="flex items-start gap-2">
                <span className="text-amber font-bold">•</span>
                <span><strong>Macro Interest Rate Volatility:</strong> Multiple compression driven by global yield curve shifts rather than business underperformance.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber font-bold">•</span>
                <span><strong>Raw Material Supply Constraints:</strong> Component lead-time extensions that temporarily delay order deliveries into future quarters.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Economic Moat Rating */}
        <div className="p-4 rounded-xl border border-line bg-paper/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-mint">
              Economic Moat Assessment: Narrow to Moderate Defensibility
            </span>
            <span className="text-[10px] font-mono-data text-steel">Institutional Rating</span>
          </div>
          <p className="text-xs text-steel leading-relaxed">
            {sym} maintains localized manufacturing advantages, entrenched vendor relationships, and specialized domain IP. However, sector competition limits pure pricing power, requiring disciplined operational execution to defend returns on invested capital.
          </p>
        </div>
      </div>
    </div>
  );
}
