"use client";

import { memo } from "react";

type MetricTrust = "medido" | "estimado" | "sin dato";

interface ProfileHeroMetric {
  label: string;
  value: string;
  detail?: string;
  trust: MetricTrust;
}

interface ProfileHeroProps {
  persistenceToneClass: string;
  persistenceLabel: string;
  athleteInitials: string;
  athleteTitle: string;
  goalText: string;
  metrics: ProfileHeroMetric[];
}

const trustTone: Record<MetricTrust, string> = {
  medido: "bg-emerald-500/15 text-emerald-200",
  estimado: "bg-amber-500/15 text-amber-200",
  "sin dato": "bg-slate-500/20 text-slate-300",
};

export const ProfileHero = memo(function ProfileHero({
  persistenceToneClass,
  persistenceLabel,
  athleteInitials,
  athleteTitle,
  goalText,
  metrics,
}: ProfileHeroProps) {
  return (
    <section className="min-w-0">
      <article className="relative overflow-hidden rounded-[2.2rem] border border-white/8 bg-[#09111b] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.35)] sm:rounded-[2.6rem] sm:p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(76,184,148,0.18),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.1),transparent_36%)]" />
        <div className="relative grid min-w-0 gap-5 sm:gap-6">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <span
              className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] ${persistenceToneClass}`}
            >
              {persistenceLabel}
            </span>
          </div>

          <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-[auto_1fr] lg:items-end">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#4cb894] bg-[#0d1724] text-3xl font-semibold text-white shadow-[0_0_0_7px_rgba(76,184,148,0.18)] sm:h-28 sm:w-28 sm:text-4xl">
                {athleteInitials}
              </div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">telemetría</p>
            </div>

            <div className="grid min-w-0 gap-4 sm:gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/42">Perfil y telemetría</p>
                </div>
                <h1 className="mt-3 break-words text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-4xl">
                  {athleteTitle}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-white/62">{goalText}</p>
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[1.45rem] border border-white/10 bg-white/6 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">{metric.label}</p>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${trustTone[metric.trust]}`}
                      >
                        {metric.trust}
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-semibold text-white">{metric.value}</p>
                    {metric.detail ? <p className="mt-1 text-xs text-white/55">{metric.detail}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
});
