"use client";

import React, { useState } from "react";
import { Briefcase, Sparkles, Check, ChevronDown, ChevronUp, Info, RotateCcw } from "lucide-react";

interface PortfolioContextGuideProps {
  value: string;
  onChange: (value: string) => void;
}

const PRESETS = [
  {
    id: "tech-heavy",
    title: "Overweight Tech",
    badge: "Diversification",
    text: "Currently overweight tech (60% in AAPL, NVDA, QQQ). Seeking sector diversification with low-beta or non-tech balance.",
  },
  {
    id: "conservative-income",
    title: "Dividend & Income",
    badge: "Conservative",
    text: "Conservative dividend portfolio focused on capital preservation, low volatility, and reliable yields (>3%).",
  },
  {
    id: "high-cash",
    title: "High Cash (30%)",
    badge: "Staged Entry",
    text: "Holding 30% dry-powder cash reserves. Looking to stage capital across 2-3 tranches over the coming months.",
  },
  {
    id: "growth-satellite",
    title: "Core-Satellite",
    badge: "Growth",
    text: "Core portfolio in broad market index ETFs. Seeking high-conviction satellite growth ideas with strong economic moats.",
  },
  {
    id: "balanced-cap",
    title: "Balanced (5% Cap)",
    badge: "Risk Cap",
    text: "Equally weighted portfolio across diversified sectors. Enforcing a strict 5% single-stock allocation limit.",
  },
];

const SMART_TAGS = [
  "Overweight Tech",
  "High Cash (30%)",
  "Dividend Focused",
  "Seeking Diversification",
  "Max 3% Position",
  "Staged Tranches (DCA)",
  "Capital Preservation",
  "Growth Seeking",
];

export function PortfolioContextGuide({ value, onChange }: PortfolioContextGuideProps) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Guided builder fields
  const [exposure, setExposure] = useState("Overweight Tech (60%+)");
  const [goal, setGoal] = useState("Capital Growth & Diversification");
  const [sizing, setSizing] = useState("Staged Tranches (2-3 tranches)");

  const handleApplyPreset = (presetText: string) => {
    onChange(presetText);
  };

  const handleAddTag = (tag: string) => {
    if (!value.trim()) {
      onChange(tag);
      return;
    }
    if (value.toLowerCase().includes(tag.toLowerCase())) {
      return;
    }
    onChange(`${value.trim()}; ${tag}`);
  };

  const handleApplyGuidedBuilder = () => {
    const generated = `Current portfolio: ${exposure}. Strategy goal: ${goal}. Preferred sizing: ${sizing}.`;
    onChange(generated);
    setShowBuilder(false);
  };

  return (
    <div className="space-y-2.5">
      {/* Header and Toggle */}
      <div className="flex items-center justify-between">
        <label
          htmlFor="portfolio"
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-steel cursor-pointer"
          onClick={() => setShowHelp(!showHelp)}
        >
          <Briefcase className="h-3.5 w-3.5 text-mint" />
          <span>Client Portfolio Context</span>
          <span className="text-[10px] font-normal text-steel/60 lowercase">(optional)</span>
        </label>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-[11px] text-mint hover:underline flex items-center gap-0.5"
            title="How to use portfolio context"
          >
            <Info className="h-3 w-3" />
            <span>Guide</span>
          </button>
          
          {value.trim() && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-[11px] text-steel hover:text-berry flex items-center gap-0.5 transition-colors"
              title="Clear context"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Helpful explanation box */}
      {showHelp && (
        <div className="rounded-xl border border-mint/20 bg-mint/5 p-3 text-xs text-steel space-y-1.5 animate-fade-in leading-relaxed">
          <p className="font-bold text-mint flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> What does the Portfolio Advisor check?
          </p>
          <p className="text-[11px] text-steel/80">
            The AI fiduciary uses your notes to calculate personalized <strong>position sizing</strong> (e.g. 1-3% starter vs 5-10% full), test for <strong>sector concentration risk</strong> (e.g. tech overweight), and verify <strong>liquidity & timing</strong>.
          </p>
          <div className="text-[10px] text-steel/70 pt-1 border-t border-mint/10 flex flex-wrap gap-2">
            <span>• What do you currently hold?</span>
            <span>• What is your investment objective?</span>
            <span>• Do you have cash ready to deploy?</span>
          </div>
        </div>
      )}

      {/* Quick Preset Cards */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-steel/70">
            Quick 1-Click Templates
          </span>
          <button
            type="button"
            onClick={() => setShowBuilder(!showBuilder)}
            className="text-[10px] font-bold uppercase tracking-wider text-mint hover:underline flex items-center gap-0.5"
          >
            {showBuilder ? (
              <>
                <span>Hide Builder</span>
                <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                <span>Guided Builder</span>
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {PRESETS.map((preset) => {
            const isSelected = value.trim() === preset.text.trim();
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.text)}
                className={`text-left p-2 rounded-lg border transition-all text-[11px] leading-tight ${
                  isSelected
                    ? "border-mint/50 bg-mint/10 text-ink shadow-sm"
                    : "border-line/60 bg-terminalBg/30 text-steel hover:border-mint/30 hover:bg-paper/40 hover:text-ink"
                }`}
              >
                <div className="flex items-center justify-between gap-1 font-bold">
                  <span className="truncate">{preset.title}</span>
                  {isSelected && <Check className="h-3 w-3 text-mint shrink-0" />}
                </div>
                <span className="text-[9px] text-mint font-semibold block mt-0.5">
                  {preset.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Guided Builder Dropdowns (when expanded) */}
      {showBuilder && (
        <div className="rounded-xl border border-line bg-paper/30 p-3 space-y-2.5 animate-fade-in text-xs">
          <div className="font-bold text-ink text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-mint" />
            <span>Interactive Context Builder</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-steel block mb-1">
                Current Exposure
              </label>
              <select
                value={exposure}
                onChange={(e) => setExposure(e.target.value)}
                className="w-full h-8 px-2 rounded-lg border border-line bg-terminalBg text-[11px] text-ink outline-none focus:border-mint"
              >
                <option value="Overweight Tech (60%+)">Overweight Tech (60%+)</option>
                <option value="Heavy Financials & Banking">Heavy Financials & Banking</option>
                <option value="Healthcare & Pharma Heavy">Healthcare & Pharma Heavy</option>
                <option value="High Cash Reserves (30%+) ready to deploy">High Cash (30%+) Ready</option>
                <option value="Diversified Core Index (S&P 500 / Nifty)">Broad Index Diversified</option>
                <option value="Defensive & High Dividend">Defensive & High Dividend</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-steel block mb-1">
                Strategy Goal
              </label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full h-8 px-2 rounded-lg border border-line bg-terminalBg text-[11px] text-ink outline-none focus:border-mint"
              >
                <option value="Capital Growth & Diversification">Capital Growth</option>
                <option value="Steady Dividend Income & Capital Preservation">Dividend Income</option>
                <option value="Hedging & Downside Protection">Downside Protection</option>
                <option value="High Conviction Growth Satellite">High Conviction Satellite</option>
                <option value="Short-to-Medium Swing Trade">Tactical Swing Trade</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-steel block mb-1">
                Position Sizing
              </label>
              <select
                value={sizing}
                onChange={(e) => setSizing(e.target.value)}
                className="w-full h-8 px-2 rounded-lg border border-line bg-terminalBg text-[11px] text-ink outline-none focus:border-mint"
              >
                <option value="Staged Tranches (2-3 tranches DCA)">Staged Tranches (DCA)</option>
                <option value="Starter Position (1-2% of total portfolio)">Starter Position (1-2%)</option>
                <option value="Moderate Core Position (3-5%)">Core Position (3-5%)</option>
                <option value="High Allocation (5-10% full sizing)">Full Allocation (5-10%)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleApplyGuidedBuilder}
              className="px-3 py-1.5 rounded-lg bg-mint text-white dark:text-slate-950 font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-opacity"
            >
              Insert into Context
            </button>
          </div>
        </div>
      )}

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          id="portfolio"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Example: Currently overweight tech; looking for defensive balance. 30% cash reserves ready for staged entry."
          rows={3}
          className="w-full resize-y min-h-[76px] border border-line bg-terminalBg/50 px-3.5 py-2.5 text-xs text-ink outline-none rounded-xl transition-all focus:border-mint focus:ring-1 focus:ring-mint/20 placeholder-steel/40 leading-relaxed font-sans"
        />
        
        {value.trim() && (
          <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5 text-[9px] font-mono-data text-mint bg-mint/10 border border-mint/20 px-2 py-0.5 rounded-md pointer-events-none">
            <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
            <span>Fiduciary Context Active</span>
          </div>
        )}
      </div>

      {/* Smart Keyword Pills */}
      <div>
        <span className="text-[10px] text-steel/60 block mb-1">
          Click to add specifics to context:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SMART_TAGS.map((tag) => {
            const hasTag = value.toLowerCase().includes(tag.toLowerCase());
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddTag(tag)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                  hasTag
                    ? "border-mint/40 bg-mint/10 text-mint font-bold"
                    : "border-line bg-paper/20 text-steel hover:border-mint/30 hover:text-ink"
                }`}
              >
                + {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
