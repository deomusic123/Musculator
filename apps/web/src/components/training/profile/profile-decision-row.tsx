"use client";

import { memo } from "react";

interface ProfileDecisionRowProps {
  readinessScore: number;
  readinessLabel: string;
  readinessToneClass: string;
  readinessRingColor: string;
  readinessRingSoft: string;
  readinessCentralPenalty: string;
  showCriticalAlert: boolean;
  weeklyNeuralCost: number;
  weeklyNeuralTarget: number;
  weeklyNeuralDelta: number;
  recoveryGapHours: number;
  weeklyNeuralProgressPercent: number;
  weeklyNeuralProgressBarPercent: number;
  weeklyNeuralOverflowPercent: number;
  nutritionSupportRatio: string;
  nutritionRecoveryGapPercent: number;
  nextActionSuggestion: string;
  sessionTitle: string;
  referencePlanLabel: string;
  onOpenReadiness: () => void;
  onOpenMetabolic: () => void;
  onOpenNextAction: () => void;
}

export const ProfileDecisionRow = memo(function ProfileDecisionRow({
  readinessScore,
  readinessLabel,
  readinessToneClass,
  readinessRingColor,
  readinessRingSoft,
  readinessCentralPenalty,
  showCriticalAlert,
  weeklyNeuralCost,
  weeklyNeuralTarget,
  weeklyNeuralDelta,
  recoveryGapHours,
  weeklyNeuralProgressPercent,
  weeklyNeuralProgressBarPercent,
  weeklyNeuralOverflowPercent,
  nutritionSupportRatio,
  nutritionRecoveryGapPercent,
  nextActionSuggestion,
  sessionTitle,
  referencePlanLabel,
  onOpenReadiness,
  onOpenMetabolic,
  onOpenNextAction,
}: ProfileDecisionRowProps) {
  return (
    <section className="min-w-0 rounded-[2.35rem] border border-white/8 bg-[#08111a] p-3 shadow-[0_24px_80px_rgba(2,6,23,0.3)] md:p-4">
      <div className="grid min-w-0 gap-3 lg:grid-cols-3">
        <article
          onClick={onOpenReadiness}
          className={`min-w-0 cursor-pointer rounded-[1.9rem] border p-5 transition hover:-translate-y-0.5 hover:border-[#4cb894]/30 ${showCriticalAlert ? "border-rose-400/35 bg-[linear-gradient(180deg,rgba(127,29,29,0.9),rgba(76,5,25,0.92))]" : "border-white/8 bg-[#0d1724]"}`}
        >
          <p className="text-sm uppercase tracking-[0.24em] text-white/45">Readiness SNC</p>
          <div className="mt-4 flex justify-center">
            <div
              className="relative flex h-36 w-36 items-center justify-center rounded-full md:h-40 md:w-40"
              style={{
                background: `conic-gradient(${readinessRingColor} ${readinessScore}%, rgba(96,165,250,0.14) 0)`,
                boxShadow: `inset 0 0 0 10px rgba(255,255,255,0.03), 0 0 0 12px ${readinessRingSoft}`,
              }}
            >
              <div className="absolute inset-[12px] rounded-full bg-[#0b1622]" />
              <div className="absolute inset-[18px] rounded-full border border-white/8 md:inset-[20px]" />
              <div className="relative z-10 text-center text-white">
                <p className="text-5xl font-semibold leading-none md:text-6xl">{readinessScore}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-white/55 md:mt-3 md:text-[12px] md:tracking-[0.34em]">
                  Readiness
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 text-center text-white">
            <p className="text-xl font-semibold md:text-2xl">{readinessLabel}</p>
            <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-7 text-white/72 md:text-base md:leading-8">
              Penalidad central {readinessCentralPenalty}. Ajustá agresividad según la fatiga acumulada.
            </p>
          </div>
          {showCriticalAlert ? (
            <div className="mt-5 rounded-[1.5rem] border-2 border-rose-300/60 bg-rose-950/40 p-4 text-rose-100">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Alerta crítica</p>
              <p className="mt-2 text-lg font-semibold">Fatiga alta detectada</p>
              <p className="mt-2 text-sm leading-6 text-rose-100/80">
                Hoy conviene reducir sets al fallo y priorizar recuperación.
              </p>
            </div>
          ) : null}
        </article>

        <article
          onClick={onOpenMetabolic}
          className="min-w-0 cursor-pointer rounded-[1.9rem] border border-white/8 bg-[#0d1724] p-5 transition hover:-translate-y-0.5 hover:border-[#4cb894]/30"
        >
          <p className="text-sm uppercase tracking-[0.24em] text-white/45">Costo neural semanal</p>
          <div className="mt-5 flex items-end justify-between gap-3 text-white">
            <p className="text-4xl font-semibold leading-none md:text-5xl">{weeklyNeuralCost}</p>
            <p className="pb-1 text-sm text-white/58">objetivo {weeklyNeuralTarget}</p>
          </div>
          <p className="mt-4 max-w-[22rem] text-sm leading-7 text-white/72 md:text-base md:leading-8">
            Delta semanal {weeklyNeuralDelta > 0 ? "+" : ""}
            {weeklyNeuralDelta}. Gap de recuperación dinámica {recoveryGapHours}h.
          </p>
          <div className="relative mt-5 h-3 overflow-hidden rounded-full bg-black/30">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-[#4cb894] via-[#6fd8b6] to-[#9cf3d3]"
              style={{ width: `${weeklyNeuralProgressBarPercent}%` }}
            />
            {weeklyNeuralOverflowPercent > 0 ? (
              <div className="absolute inset-y-0 right-0 w-[3px] bg-amber-200/90" />
            ) : null}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/45">
            <span>{weeklyNeuralProgressPercent}% del objetivo</span>
            {weeklyNeuralOverflowPercent > 0 ? (
              <span className="rounded-full border border-amber-200/45 bg-amber-300/15 px-2 py-1 text-[10px] font-semibold tracking-[0.16em] text-amber-100">
                Exceso +{weeklyNeuralOverflowPercent}%
              </span>
            ) : null}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Soporte nutricional</p>
              <p className="mt-3 text-3xl font-semibold text-white md:text-4xl">{nutritionSupportRatio}</p>
            </div>
            <div className="min-w-0 rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Gap nutricional</p>
              <p className="mt-3 text-3xl font-semibold text-white md:text-4xl">{nutritionRecoveryGapPercent}%</p>
            </div>
          </div>
        </article>

        <article
          onClick={onOpenNextAction}
          className="min-w-0 cursor-pointer rounded-[1.9rem] border border-white/8 bg-[#09111b] p-5 transition hover:-translate-y-0.5 hover:border-[#4cb894]/30"
        >
          <p className="text-sm uppercase tracking-[0.24em] text-white/45">Siguiente acción sugerida</p>
          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
            <p className="break-words text-base leading-8 text-white/82 md:text-lg md:leading-9">
              {nextActionSuggestion}
            </p>
          </div>
          <div className="mt-5 grid gap-3">
            <div className={`min-w-0 rounded-[1.35rem] border px-4 py-4 ${readinessToneClass}`}>
              <p className="text-[11px] uppercase tracking-[0.18em] opacity-75">Estado readiness</p>
              <p className="mt-2 text-xl font-semibold">{readinessLabel}</p>
            </div>
            <div className="min-w-0 rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Bloque actual</p>
              <p className="mt-2 break-words text-lg font-semibold text-white">{sessionTitle}</p>
              <p className="mt-2 text-xs text-white/52">Plan de referencia: {referencePlanLabel}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
});
