"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart2,
  BookOpen,
  CheckSquare,
  ChevronRight,
  FileText,
  Home,
  Menu,
  Moon,
  Newspaper,
  PlusCircle,
  Scale,
  Sun,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";

interface NavItem {
  label: string;
  href: string;
  slug: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

function buildNavItems(symbol: string | null, hasData: boolean): NavItem[] {
  const base = symbol ? `/analysis/${symbol}` : null;
  return [
    { label: "Overview",          slug: "overview",    href: base ?? "/",                   icon: BarChart2,    disabled: !hasData },
    { label: "Investment Debate", slug: "debate",      href: base ? `${base}/debate` : "/",      icon: Scale,        disabled: !hasData },
    { label: "Investment Thesis", slug: "thesis",      href: base ? `${base}/thesis` : "/",      icon: BookOpen,     disabled: !hasData },
    { label: "Action Plan",       slug: "actions",     href: base ? `${base}/actions` : "/",     icon: CheckSquare,  disabled: !hasData },
    { label: "Analyst Reports",   slug: "reports",     href: base ? `${base}/reports` : "/",     icon: FileText,     disabled: !hasData },
    { label: "News & Catalysts",  slug: "news",        href: base ? `${base}/news` : "/",        icon: Newspaper,    disabled: !hasData },
  ];
}

const SECTION_TITLES: Record<string, string> = {
  overview: "Overview",
  debate: "Investment Debate",
  thesis: "Investment Thesis",
  "action-plan": "Action Plan",
  actions: "Action Plan",
  reports: "Analyst Reports",
  news: "News & Catalysts",
};

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { result, loading, error, clearResult, toggleTheme, theme } = useAnalysis();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAnalysisPage = pathname.startsWith("/analysis");
  const pathParts = pathname.split("/").filter(Boolean);
  const pathSymbol = isAnalysisPage && pathParts[1] ? pathParts[1].toUpperCase() : null;
  const currentSlug = isAnalysisPage ? (pathParts[2] || "overview") : "";

  const primaryAnalysis = result?.analyses.find(
    (a) => a.symbol.split(".")[0].toUpperCase() === pathSymbol
  ) ?? result?.analyses[0] ?? null;

  const symbol = primaryAnalysis?.symbol?.split(".")[0] ?? pathSymbol ?? null;
  const companyName = primaryAnalysis?.company_name ?? symbol;
  const hasData = !!result && !loading;

  const showSidebar = isAnalysisPage;
  const navItems = buildNavItems(symbol, hasData || isAnalysisPage);

  const handleNewAnalysis = () => {
    clearResult();
    router.push("/");
  };

  const sectionName = SECTION_TITLES[currentSlug] || "Overview";

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink transition-colors duration-200">
      {/* ── Fixed Brand Header ── */}
      <header className="border-b border-line bg-paper/85 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            {showSidebar && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg border border-line bg-paper text-ink hover:border-mint transition-colors"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            )}

            <Link href="/" className="min-w-0 group" aria-label="StockMaster.AI home">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-mint animate-pulse" />
                <p className="text-xs font-black text-mint tracking-[0.18em] uppercase transition-colors group-hover:opacity-90">
                  StockMaster.AI
                </p>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-ink mt-0.5 truncate">
                AI Investment Research Partner
              </h1>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Active Company Chip */}
            {symbol && (
              <Link
                href={`/analysis/${symbol}`}
                className="flex h-8 sm:h-9 items-center border border-line bg-paper/80 px-2.5 sm:px-3 text-xs font-bold text-steel rounded-lg max-w-[200px] sm:max-w-[260px] shadow-sm hover:border-mint transition-colors group"
                title="View Active Overview"
              >
                <span className="text-mint font-black truncate group-hover:underline">
                  {companyName}
                </span>
                <span className="font-mono-data text-[10px] text-steel/60 ml-1.5 hidden md:inline">
                  ({symbol})
                </span>
                <span className="text-[11px] text-mint font-bold ml-1.5">→</span>
              </Link>
            )}

            {/* New Search */}
            <button
              type="button"
              onClick={handleNewAnalysis}
              className="flex h-8 sm:h-9 items-center gap-1.5 px-2.5 sm:px-3 rounded-lg border border-line bg-paper/60 text-xs font-bold text-ink hover:border-mint hover:text-mint transition-all shadow-sm"
              title="Start a new search"
            >
              <PlusCircle className="h-3.5 w-3.5 text-mint" />
              <span className="hidden sm:inline">New Search</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-line bg-paper text-ink transition-all hover:bg-line/40 active:scale-95 shadow-sm"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-500" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Collapsible Drawer ── */}
      {showSidebar && mobileMenuOpen && (
        <div className="lg:hidden border-b border-line bg-paper/95 backdrop-blur-md px-4 py-3 space-y-1 animate-fade-in z-40">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-steel hover:text-ink hover:bg-line/30"
          >
            <Home className="h-4 w-4 text-mint" />
            <span>Research Setup</span>
          </Link>
          <div className="h-px bg-line/60 my-1" />
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              (item.slug === "overview" && (currentSlug === "overview" || !currentSlug)) ||
              (item.slug !== "overview" && (currentSlug === item.slug || (item.slug === "action-plan" && currentSlug === "actions")));

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? "bg-mint/10 text-mint border border-mint/20"
                    : "text-steel hover:text-ink hover:bg-line/20"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? "text-mint" : "text-steel"}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-mint" />}
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Main Layout with Persistent Sidebar ── */}
      <div className="flex flex-1 mx-auto w-full max-w-7xl">
        {/* Persistent Desktop Sidebar */}
        {showSidebar && (
          <aside
            className="hidden lg:flex flex-col gap-1 w-64 shrink-0 pt-6 px-4 border-r border-line bg-paper/30 sticky top-[61px] h-[calc(100vh-61px)] overflow-y-auto"
            aria-label="Platform navigation"
          >
            {/* Research Setup */}
            <Link
              href="/"
              className={`nav-item ${pathname === "/" ? "active" : ""}`}
            >
              <Home className="h-4 w-4 shrink-0 text-steel group-hover:text-mint" />
              <span>Research Setup</span>
            </Link>

            <div className="my-2.5 h-px bg-line/60" role="separator" />

            {/* Active Company Badge in Sidebar */}
            {symbol && (
              <div className="px-3 mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-steel/60">
                  {symbol} Analysis
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />
              </div>
            )}

            {/* Navigation Links */}
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  (item.slug === "overview" && (currentSlug === "overview" || !currentSlug)) ||
                  (item.slug !== "overview" && (currentSlug === item.slug || (item.slug === "action-plan" && currentSlug === "actions")));

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`nav-item flex items-center justify-between group transition-all ${
                      isActive ? "active font-extrabold text-mint bg-mint/10 border border-mint/25 shadow-sm" : "text-steel hover:text-ink"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-mint" : "text-steel group-hover:text-mint"}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-mint" />}
                  </Link>
                );
              })}
            </div>

            {/* Security Quick Summary in Sidebar Footer */}
            {primaryAnalysis && (
              <div className="mt-auto mb-4 p-3 rounded-xl border border-line bg-paper/60 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-steel">
                  <span>Verdict</span>
                  <span className={`px-1.5 py-0.5 rounded font-black ${
                    primaryAnalysis.recommendation === "Buy"
                      ? "bg-emerald-500/15 text-emerald-500"
                      : primaryAnalysis.recommendation === "Sell"
                      ? "bg-rose-500/15 text-rose-500"
                      : "bg-amber/15 text-amber"
                  }`}>
                    {primaryAnalysis.recommendation}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono-data text-ink">
                  <span className="text-steel">AI Conviction</span>
                  <span className="font-bold text-mint">{Math.round(primaryAnalysis.confidence * 100)}%</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono-data text-ink">
                  <span className="text-steel">Risk Score</span>
                  <span className={`font-bold ${primaryAnalysis.risk_score > 65 ? "text-rose-500" : "text-amber"}`}>
                    {primaryAnalysis.risk_score}/100
                  </span>
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Content Area */}
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8" role="main">
          {/* Breadcrumb Navigation Bar */}
          {isAnalysisPage && symbol && (
            <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-steel">
              <Link href="/" className="hover:text-mint transition-colors">
                StockMaster
              </Link>
              <ChevronRight className="h-3 w-3 text-steel/50" />
              <Link href={`/analysis/${symbol}`} className="hover:text-mint transition-colors">
                {companyName} ({symbol})
              </Link>
              {currentSlug !== "overview" && (
                <>
                  <ChevronRight className="h-3 w-3 text-steel/50" />
                  <span className="text-mint">{sectionName}</span>
                </>
              )}
            </nav>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm">Analysis Pipeline Error</p>
                <p className="text-xs text-rose-500/90">{error}</p>
                <button
                  type="button"
                  onClick={handleNewAnalysis}
                  className="mt-2 text-xs font-bold underline hover:text-ink"
                >
                  Return to Search
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-4 animate-fade-in text-center">
              <Loader2 className="h-10 w-10 text-mint animate-spin" />
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                  Orchestrating Multi-Agent Financial Committee...
                </h3>
                <p className="text-xs text-steel max-w-sm">
                  Synthesizing real-time market telemetry, CMT technicals, news catalysts, and risk adjudication.
                </p>
              </div>
            </div>
          )}

          {!loading && children}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-line py-4 px-6 text-center text-xs text-steel/60 bg-paper/30 mt-auto">
        <p className="max-w-4xl mx-auto">
          StockMaster.AI provides AI-generated financial research for informational support only — not licensed investment advice. Validate data with certified professionals before executing trades.
        </p>
      </footer>
    </div>
  );
}
