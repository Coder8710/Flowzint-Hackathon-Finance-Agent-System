type TrendSparklineProps = {
  history?: unknown;
};

export function TrendSparkline({ history }: TrendSparklineProps) {
  const rows = Array.isArray(history) ? history : [];
  const closes = rows
    .map((row) => (typeof row === "object" && row && "close" in row ? Number(row.close) : NaN))
    .filter((value) => Number.isFinite(value));

  if (closes.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center border border-dashed border-line text-sm text-ink/55 rounded-lg bg-white/60">
        No chart data
      </div>
    );
  }

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const isPositive = closes[closes.length - 1] >= closes[0];
  const strokeColor = isPositive ? "#1d8a70" : "#8c315d";
  const fillId = isPositive ? "fillGreen" : "fillRed";

  const linePoints = closes
    .map((value, index) => {
      const x = (index / (closes.length - 1)) * 100;
      const y = 90 - ((value - min) / range) * 80;
      return `${x},${y}`;
    })
    .join(" ");

  // Area fill: line points + close at bottom
  const areaPoints = `0,90 ${linePoints} 100,90`;

  return (
    <div className="rounded-lg border border-line bg-white/60 p-2 animate-fade-in">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs font-medium text-ink/50 uppercase tracking-wider">Price Trend</span>
        <span className={`text-xs font-bold ${isPositive ? "text-mint" : "text-berry"}`}>
          {isPositive ? "▲" : "▼"} ${closes[closes.length - 1].toFixed(2)}
        </span>
      </div>
      <svg viewBox="0 0 100 100" className="h-28 w-full" role="img" aria-label="Price trend">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#${fillId})`} />
        <polyline points={linePoints} fill="none" stroke={strokeColor} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="0" y1="90" x2="100" y2="90" stroke="#d9d6ca" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
