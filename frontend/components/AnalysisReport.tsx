import { AlertTriangle, BarChart3, Newspaper, ShieldCheck, Target, TrendingUp } from "lucide-react";
import { CompanyAnalysis } from "@/lib/types";
import { MetricBar } from "./MetricBar";
import { TrendSparkline } from "./TrendSparkline";

const icons = [BarChart3, TrendingUp, Newspaper, Target, AlertTriangle, ShieldCheck];

export function AnalysisReport({ analysis }: { analysis: CompanyAnalysis }) {
  const technical = analysis.agents.find((agent) => agent.agent === "Technical Analysis Agent");
  const agentScores = analysis.agents.map((agent) => Number(agent.data.score ?? 50));

  return (
    <section className="border-y border-line bg-white/78 rounded-lg animate-fade-in-up">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[360px_1fr] lg:px-6">
        <aside className="min-w-0 space-y-5">
          <div className="border border-line bg-paper p-5 shadow-panel rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-steel tracking-wide">{analysis.symbol}</p>
                <h2 className="break-words text-2xl font-bold tracking-tight text-ink">{analysis.company_name}</h2>
              </div>
              <span
                className={`shrink-0 border px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${
                  analysis.recommendation === "Buy"
                    ? "border-mint bg-mint/10 text-mint"
                    : analysis.recommendation === "Sell"
                      ? "border-berry bg-berry/10 text-berry"
                      : "border-amber bg-amber/10 text-amber"
                }`}
              >
                {analysis.recommendation}
              </span>
            </div>
            <p className="mt-3 text-sm text-ink/65">{analysis.target_bias}</p>
            <div className="mt-5 space-y-4">
              <MetricBar label="Confidence" value={analysis.confidence * 100} tone="good" />
              <MetricBar label="Risk score" value={analysis.risk_score} tone={analysis.risk_score > 65 ? "bad" : "warn"} />
            </div>
          </div>

          <TrendSparkline history={technical?.data.history} />
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-line bg-paper p-5 rounded-lg card-hover">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink/60">Investment Thesis</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink/78">
                {analysis.thesis.map((item, idx) => (
                  <li key={item} className={`border-l-2 border-mint pl-3 animate-slide-in-left stagger-${idx + 1}`}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-line bg-paper p-5 rounded-lg card-hover">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink/60">Next Actions</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink/78">
                {analysis.action_items.map((item, idx) => (
                  <li key={item} className={`border-l-2 border-amber pl-3 animate-slide-in-left stagger-${idx + 1}`}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {analysis.agents.map((agent, index) => {
              const Icon = icons[index % icons.length];
              return (
                <article
                  key={agent.agent}
                  className={`min-w-0 border border-line bg-white p-4 rounded-lg card-hover animate-fade-in-up stagger-${index + 1}`}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-steel" aria-hidden />
                    <h3 className="truncate text-sm font-semibold text-ink">{agent.agent}</h3>
                  </div>
                  <p className="min-h-12 text-sm text-ink/72">{agent.summary}</p>
                  {agent.signals.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {agent.signals.slice(0, 2).map((signal) => (
                        <li key={signal} className="text-xs text-ink/55 border-l border-line pl-2 truncate">
                          {signal}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4">
                    <MetricBar label="Agent score" value={agentScores[index]} tone={agentScores[index] >= 60 ? "good" : agentScores[index] <= 40 ? "bad" : "info"} />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="border border-line bg-paper p-5 rounded-lg">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink/60">News Feed</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {analysis.news.map((item) => (
                <a
                  key={`${item.title}-${item.url}`}
                  href={item.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="block min-w-0 border border-line bg-white p-4 rounded-lg card-hover"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-steel">{item.source}</p>
                  <h4 className="mt-1 text-sm font-semibold text-ink">{item.title}</h4>
                  {item.summary ? <p className="mt-2 line-clamp-2 text-sm text-ink/62">{item.summary}</p> : null}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
