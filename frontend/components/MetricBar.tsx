"use client";
import { useEffect, useState } from "react";

type MetricBarProps = {
  label: string;
  value: number;
  tone?: "good" | "warn" | "bad" | "info";
};

// Use explicit hex colors via inline style — avoids Tailwind JIT missing custom color classes
const toneGradients: Record<string, string> = {
  good: "linear-gradient(to right, #10b981, #089981)",
  warn: "linear-gradient(to right, #f59e0b, #fbbf24)",
  bad:  "linear-gradient(to right, #f43f5e, #fb7185)",
  info: "linear-gradient(to right, #64748b, #94a3b8)",
};

const toneShadows: Record<string, string> = {
  good: "0 0 8px rgba(16,185,129,0.5)",
  warn: "0 0 8px rgba(251,191,36,0.5)",
  bad:  "0 0 8px rgba(244,63,94,0.5)",
  info: "0 0 8px rgba(148,163,184,0.4)",
};

export function MetricBar({ label, value, tone = "info" }: MetricBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const [width, setWidth] = useState(0);

  // Animate from 0 → target after mount — guarantees the transition always plays
  useEffect(() => {
    setWidth(0);
    const t = setTimeout(() => setWidth(clamped), 120);
    return () => clearTimeout(t);
  }, [clamped]);

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wider text-steel">
        <span>{label}</span>
        <span className="font-mono-data text-xs font-bold text-ink">{Math.round(clamped)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(100,116,139,0.15)", border: "1px solid rgba(100,116,139,0.2)" }}>
        <div
          style={{
            height: "100%",
            width: `${width}%`,
            minWidth: width > 0 ? "4px" : "0",
            borderRadius: "9999px",
            background: toneGradients[tone],
            boxShadow: toneShadows[tone],
            transition: "width 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        />
      </div>
    </div>
  );
}
