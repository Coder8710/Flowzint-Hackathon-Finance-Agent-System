type MetricBarProps = {
  label: string;
  value: number;
  tone?: "good" | "warn" | "bad" | "info";
};

const toneClasses = {
  good: "bg-gradient-to-r from-emerald-500 to-mint shadow-[0_0_8px_rgba(16,185,129,0.4)]",
  warn: "bg-gradient-to-r from-amber-500 to-amber shadow-[0_0_8px_rgba(251,191,36,0.4)]",
  bad: "bg-gradient-to-r from-rose-500 to-berry shadow-[0_0_8px_rgba(244,63,94,0.4)]",
  info: "bg-gradient-to-r from-slate-500 to-steel shadow-[0_0_8px_rgba(148,163,184,0.4)]"
};

export function MetricBar({ label, value, tone = "info" }: MetricBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wider text-steel">
        <span>{label}</span>
        <span className="font-mono-data text-xs font-bold text-ink">{Math.round(clamped)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-terminalBg border border-line/60">
        <div
          className={`h-full ${toneClasses[tone]} rounded-full animate-grow-width transition-all duration-1000`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
