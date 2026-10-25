type TrendSparklineProps = {
  symbol?: string;
  history?: unknown;
  currency?: string;
  historyIsSimulated?: boolean;
};

export function TrendSparkline({ symbol, history, currency, historyIsSimulated }: TrendSparklineProps) {
  const rows = Array.isArray(history) ? history : [];
  const closes = rows
    .map((row) => (typeof row === "object" && row && "close" in row ? Number(row.close) : NaN))
    .filter((value) => Number.isFinite(value));

  if (closes.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center border border-dashed border-line/30 text-xs font-semibold text-steel/60 rounded-lg bg-slate-950/40">
        No chart data available
      </div>
    );
  }

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const isPositive = closes[closes.length - 1] >= closes[0];
  
  // High contrast neon colors for terminal theme
  const strokeColor = isPositive ? "#10b981" : "#f43f5e";
  const fillId = isPositive ? "sparklineFillGreen" : "sparklineFillRed";

  const linePoints = closes
    .map((value, index) => {
      const x = (index / (closes.length - 1)) * 100;
      const y = 90 - ((value - min) / range) * 80;
      return `${x},${y}`;
    })
    .join(" ");

  // Area fill: line points + close at bottom
  const areaPoints = `0,90 ${linePoints} 100,90`;

  const currencySymbol = 
    currency?.toUpperCase() === "INR" || 
    symbol?.toUpperCase().endsWith(".NS") || 
    symbol?.toUpperCase().endsWith(".BO") 
      ? "₹" 
      : "$";


  return (
    <div className="rounded-xl glass-panel p-4 animate-fade-in card-hover">
      <div className="flex items-center justify-between px-1 mb-2.5">
        <span className="text-xs font-bold text-steel uppercase tracking-wider">Historical Trend</span>
        {historyIsSimulated && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400" title="Yahoo Finance did not provide enough history; this chart uses deterministic sample data.">
            Simulated data
          </span>
        )}
        <span className={`font-mono-data text-sm font-bold flex items-center gap-1 ${isPositive ? "text-mint" : "text-berry"}`}>
          {isPositive ? "▲" : "▼"} {currencySymbol}{closes[closes.length - 1].toFixed(2)}
        </span>
      </div>
      <div className="relative h-28 w-full">
        <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="Price trend" preserveAspectRatio="none">
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Reference baseline grid */}
          <line x1="0" y1="10" x2="100" y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1="0" y1="90" x2="100" y2="90" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          
          {/* Filled Area */}
          <polygon points={areaPoints} fill={`url(#${fillId})`} />
          
          {/* Sparkline Line */}
          <polyline 
            points={linePoints} 
            fill="none" 
            stroke={strokeColor} 
            strokeWidth="2" 
            vectorEffect="non-scaling-stroke" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </div>
    </div>
  );
}
