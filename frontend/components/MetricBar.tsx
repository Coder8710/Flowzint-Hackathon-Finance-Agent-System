type MetricBarProps = {
  label: string;
  value: number;
  tone?: "good" | "warn" | "bad" | "info";
};

const toneClasses = {
  good: "bg-mint",
  warn: "bg-amber",
  bad: "bg-berry",
  info: "bg-steel"
};

export function MetricBar({ label, value, tone = "info" }: MetricBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-wider text-ink/60">
        <span>{label}</span>
        <span className="font-bold tabular-nums">{Math.round(clamped)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className={`h-full ${toneClasses[tone]} rounded-full animate-grow-width`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
