"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart2,
  BookOpen,
  CheckSquare,
  FileText,
  Home,
  Moon,
  Newspaper,
  PlusCircle,
  Scale,
  Sun,
  Zap,
} from "lucide-react";
import { useAnalysis } from "@/components/AnalysisContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

function buildNavItems(symbol: string | null, hasData: boolean): NavItem[] {
  const base = symbol ? `/analysis/${symbol}` : null;
  return [
    { label: "Overview",            href: base ?? "/",               icon: BarChart2,    disabled: !hasData },
    { label: "Investment Debate",   href: base ? `${base}/debate` : "/", icon: Scale,      disabled: !hasData },
    { label: "Investment Thesis",   href: base ? `${base}/thesis` : "/", icon: BookOpen,   disabled: !hasData },
    { label: "Action Plan",         href: base ? `${base}/actions` : "/", icon: CheckSquare,disabled: !hasData },
    { label: "Analyst Reports",     href: base ? `${base}/reports` : "/", icon: FileText,   disabled: !hasData },
    { label: "News & Catalysts",    href: base ? `${base}/news` : "/", icon: Newspaper,   disabled: !hasData },
  ];
}

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { result, loading, clearResult, toggleTheme, theme } = useAnalysis();
  const pathname = usePathname();
  const router = useRouter();

  const isAnalysisPage = pathname.startsWith("/analysis");
  const primaryAnalysis = result?.analyses[0] ?? null;
  const pathSymbol = isAnalysisPage ? pathname.split("/")[2]?.toUpperCase() : null;
  const symbol = primaryAnalysis?.symbol?.split(".")[0] ?? pathSymbol ?? null;
  const companyName = primaryAnalysis?.company_name ?? null;
  const hasData = !!result && !loading;

  // The sidebar ONLY appears after searching a company name (on analysis deep-dive routes)
  const showSidebar = isAnalysisPage;
  const navItems = buildNavItems(symbol, hasData || isAnalysisPage);

  const handleNewAnalysis = () => {
    clearResult();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200">
      {/* ── Brand Header (Matches original Stockmaster.ai) ── */}
      <header className="border-b border-line bg-paper/75 backdrop-blur-md sticky top-0 z-50 animate-fade-in">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="min-w-0 group" aria-label="Stockmaster.ai home">
            <div className="flex items-center gap-2">
              <p className="text-xs font-black text-mint tracking-[0.18em] uppercase transition-colors group-hover:opacity-90">
                Stockmaster.ai
              </p>
            </div>
            <h1 className="break-words text-xl font-extrabold tracking-tight text-ink mt-0.5 font-sans">
              Your AI Investment Research Partner
            </h1>
          </Link>

          <div className="flex items-center gap-3 self-end lg:self-auto">
            {/* Active Company Chip */}
            {symbol && (
              <Link
                href={`/analysis/${symbol}`}
                className="flex h-9 items-center border border-line bg-paper px-3.5 text-xs font-bold text-steel rounded-lg max-w-[240px] shadow-sm hover:border-mint transition-colors group"
                title="View active analysis"
              >
                <span className="text-mint font-black min-w-0 truncate group-hover:underline">
                  {companyName || symbol}
                </span>
                <span className="font-mono-data text-[10px] text-steel/60 ml-1.5 hidden sm:inline">
                  ({symbol})
                </span>
                <span className="text-[11px] text-mint font-bold ml-1.5">→</span>
              </Link>
            )}

            {/* New analysis button (if results present) */}
            {hasData && (
              <button
                type="button"
                onClick={handleNewAnalysis}
                className="flex h-9 items-center gap-1.5 px-3 rounded-lg border border-line bg-paper/60 text-xs font-bold text-ink hover:border-mint hover:text-mint transition-all shadow-sm"
                title="Start a new analysis"
              >
                <PlusCircle className="h-3.5 w-3.5 text-mint" />
                <span className="hidden sm:inline">New Search</span>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-paper text-ink transition-all hover:bg-line/40 active:scale-95 shadow-sm"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
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

      {/* ── Main Layout: Nav + Content ── */}
      <div className="flex flex-1 mx-auto w-full max-w-7xl">
        {/* Left Sidebar (Desktop) - ONLY shown on analysis deep-dive routes after search */}
        {showSidebar && (
          <aside
            className="hidden lg:flex flex-col gap-1 w-60 shrink-0 pt-6 px-4 border-r border-line bg-paper/20 animate-fade-in"
            aria-label="Platform navigation"
          >
            {/* Research / Home */}
            <Link
              href="/"
              className={`nav-item ${pathname === "/" ? "active" : ""}`}
              aria-current={pathname === "/" ? "page" : undefined}
            >
              <Home className="h-4 w-4 shrink-0" aria-hidden />
              <span>Research Setup</span>
            </Link>

            <div className="my-2.5 h-px bg-line/60" role="separator" />

            {/* Active Company Header */}
            {symbol && (
              <div className="px-3 mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-steel/60">
                  {symbol} Analysis
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
              </div>
            )}

            {/* Analysis Route Links */}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const cls = [
                "nav-item",
                isActive ? "active" : "",
                item.disabled ? "disabled" : "",
              ]
                .filter(Boolean)
                .join(" ");

              if (item.disabled) {
                return (
                  <span
                    key={item.label}
                    className={cls}
                    title="Run an analysis first"
                    aria-disabled="true"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{item.label}</span>
                  </span>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cls}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </aside>
        )}

        {/* Content Area */}
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8" role="main">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar (Only on analysis pages) ── */}
      {showSidebar && (
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-paper/90 backdrop-blur-lg animate-fade-in"
          aria-label="Mobile navigation"
        >
          <div className="flex overflow-x-auto py-1 px-2 gap-1 justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.disabled ? "#" : item.href}
                  className={`flex flex-col items-center gap-1 px-2 py-1.5 min-w-[3.8rem] rounded-lg text-center transition-all ${
                    isActive
                      ? "text-mint font-bold bg-mint/10"
                      : item.disabled
                      ? "text-steel/30 pointer-events-none"
                      : "text-steel hover:text-ink"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="text-[9px] uppercase tracking-wider font-bold leading-tight">
                    {item.label.split(" ")[0]}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Footer */}
      <footer
        className="border-t border-line py-4 px-6 text-center text-xs text-steel/60 bg-paper/30 mt-auto"
        role="contentinfo"
      >
        <p className="max-w-4xl mx-auto">
          Stockmaster.ai provides AI-generated financial research for informational support only — not licensed investment advice. Validate data with certified professionals before executing trades.
        </p>
      </footer>
    </div>
  );
}
