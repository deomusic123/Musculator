"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLiveSessionStore } from "@/lib/live/live-session-store";

interface LiveSessionShellProps {
  sessionId: string;
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(totalSeconds, 0);
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");

  return `${minutes}:${remainder}`;
}

export function LiveSessionShell({ sessionId }: LiveSessionShellProps) {
  const [clockNow, setClockNow] = useState(Date.now());
  const [hydrated, setHydrated] = useState(false);
  const draft = useLiveSessionStore((state) => state.draft);
  const sessionIdInStore = useLiveSessionStore((state) => state.sessionId);
  const startedAtMs = useLiveSessionStore((state) => state.startedAtMs);
  const pausedAtMs = useLiveSessionStore((state) => state.pausedAtMs);
  const pausedAccumulatedMs = useLiveSessionStore((state) => state.pausedAccumulatedMs);
  const entryIndex = useLiveSessionStore((state) => state.entryIndex);
  const setIndex = useLiveSessionStore((state) => state.setIndex);
  const isPaused = useLiveSessionStore((state) => state.isPaused);
  const completedSets = useLiveSessionStore((state) => state.completedSets);
  const restEndsAtMs = useLiveSessionStore((state) => state.restEndsAtMs);
  const initializeSession = useLiveSessionStore((state) => state.initializeSession);
  const togglePause = useLiveSessionStore((state) => state.togglePause);
  const selectSet = useLiveSessionStore((state) => state.selectSet);
  const completeCurrentSet = useLiveSessionStore((state) => state.completeCurrentSet);
  const clearRest = useLiveSessionStore((state) => state.clearRest);
  const resetSession = useLiveSessionStore((state) => state.resetSession);

  const activeEntry = draft?.entries[entryIndex] ?? null;
  const plannedSet = activeEntry?.sets[setIndex] ?? null;
  const [reps, setReps] = useState(plannedSet?.reps ?? 8);
  const [loadKg, setLoadKg] = useState(plannedSet?.weightKg ?? 40);
  const [rpe, setRpe] = useState(plannedSet?.rpe ?? 8);

  useEffect(() => {
    const finish = () => setHydrated(true);

    if (useLiveSessionStore.persist.hasHydrated()) {
      finish();
    }

    return useLiveSessionStore.persist.onFinishHydration(finish);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    initializeSession(sessionId);
  }, [hydrated, initializeSession, sessionId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setReps(plannedSet?.reps ?? 8);
    setLoadKg(plannedSet?.weightKg ?? 40);
    setRpe(plannedSet?.rpe ?? 8);
  }, [plannedSet?.reps, plannedSet?.rpe, plannedSet?.weightKg, entryIndex, setIndex]);

  const elapsedSeconds = useMemo(() => {
    if (!startedAtMs) {
      return 0;
    }

    const nowAnchor = isPaused && pausedAtMs ? pausedAtMs : clockNow;
    const elapsedMs = nowAnchor - startedAtMs - pausedAccumulatedMs;

    return Math.max(Math.floor(elapsedMs / 1000), 0);
  }, [clockNow, isPaused, pausedAccumulatedMs, pausedAtMs, startedAtMs]);

  const restSecondsLeft = restEndsAtMs
    ? Math.max(Math.ceil((restEndsAtMs - clockNow) / 1000), 0)
    : 0;

  const totalSets = draft?.entries.reduce((sum, entry) => sum + entry.sets.length, 0) ?? 0;
  const completedCount = completedSets.length;
  const progressPercent = totalSets > 0 ? Math.round((completedCount / totalSets) * 100) : 0;
  const workoutDone = Boolean(draft && completedCount >= totalSets && totalSets > 0);

  if (!hydrated) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-[#05080f] px-4 text-white">
        <div className="rounded-[1.8rem] border border-white/10 bg-[#08111a] px-6 py-5 text-sm text-white/70">
          Cargando sesión live...
        </div>
      </main>
    );
  }

  if (!draft || sessionIdInStore !== sessionId) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-[#05080f] px-4 text-white">
        <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#08111a] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
          <p className="text-sm uppercase tracking-[0.24em] text-white/45">Live</p>
          <h1 className="mt-3 text-3xl font-semibold">No hay una rutina cargada</h1>
          <p className="mt-3 text-sm leading-7 text-white/65">
            Volvé al dashboard, elegí una rutina en el check-in y arrancá de nuevo. El modo live necesita el plan de ejercicios.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/?live=1"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#4cb894] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#63c7a5]"
            >
              Elegir rutina
            </Link>
            <Link
              href="/lab/templates"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Ver rutinas en Lab
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] overflow-x-hidden bg-[#05080f] px-3 py-3 text-white sm:px-4 sm:py-4">
      <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] max-w-5xl flex-col gap-4 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(76,184,148,0.16),transparent_0_30%),#08111a] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:min-h-[calc(100svh-2rem)] sm:p-6">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.24em] text-white/45">Sesión live</p>
            <h1 className="mt-2 break-words text-3xl font-semibold md:text-4xl">{draft.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
              {draft.notes ?? "Ejecutá el bloque set por set. Los valores salen de la rutina elegida."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Salir
            </Link>
            <button
              type="button"
              onClick={() => {
                resetSession();
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.4rem] border border-white/10 bg-black/25 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Cronómetro</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">{formatDuration(elapsedSeconds)}</p>
            <button
              type="button"
              onClick={togglePause}
              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 text-sm font-medium transition hover:bg-white/10"
            >
              {isPaused ? "Reanudar" : "Pausar"}
            </button>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-black/25 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Descanso</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-[#9cf3d3]">
              {formatDuration(restSecondsLeft)}
            </p>
            {restSecondsLeft > 0 ? (
              <button
                type="button"
                onClick={clearRest}
                className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 text-sm font-medium transition hover:bg-white/10"
              >
                Saltar descanso
              </button>
            ) : (
              <p className="mt-3 text-sm text-white/50">Listo para la siguiente serie</p>
            )}
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-black/25 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Progreso</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">
              {completedCount}/{totalSets}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#4cb894]"
                style={{ width: `${Math.max(progressPercent, 4)}%` }}
              />
            </div>
          </div>
        </section>

        {workoutDone ? (
          <section className="rounded-[1.8rem] border border-emerald-400/25 bg-emerald-500/10 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-200/80">Bloque completo</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Buen trabajo</h2>
            <p className="mt-2 text-sm leading-7 text-white/70">
              Marcaste {completedCount} series de {draft.title}. Volvé al dashboard para revisar readiness o arrancá otra rutina.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#4cb894] px-5 py-3 text-sm font-semibold text-slate-950"
              >
                Volver al dashboard
              </Link>
              <Link
                href="/?live=1"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-white"
              >
                Otra rutina
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid min-w-0 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="min-w-0 rounded-[1.8rem] border border-white/10 bg-white/6 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-white/45">Ejercicio actual</p>
              <h2 className="mt-3 text-3xl font-semibold">{activeEntry?.name}</h2>
              <p className="mt-2 text-sm text-white/55">
                {activeEntry?.category} · {activeEntry?.primaryMuscle} · set {setIndex + 1}/
                {activeEntry?.sets.length ?? 0}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.3rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">Reps</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button type="button" onClick={() => setReps((value) => Math.max(value - 1, 1))} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl">-</button>
                    <span className="text-2xl font-semibold tabular-nums">{reps}</span>
                    <button type="button" onClick={() => setReps((value) => Math.min(value + 1, 40))} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl">+</button>
                  </div>
                </div>
                <div className="rounded-[1.3rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">Carga</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button type="button" onClick={() => setLoadKg((value) => Math.max(value - 2.5, 0))} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl">-</button>
                    <span className="text-2xl font-semibold tabular-nums">{loadKg}</span>
                    <button type="button" onClick={() => setLoadKg((value) => Math.min(value + 2.5, 400))} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl">+</button>
                  </div>
                </div>
                <div className="rounded-[1.3rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">RPE</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button type="button" onClick={() => setRpe((value) => Math.max(value - 1, 1))} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl">-</button>
                    <span className="text-2xl font-semibold tabular-nums">{rpe}</span>
                    <button type="button" onClick={() => setRpe((value) => Math.min(value + 1, 10))} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl">+</button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  completeCurrentSet({
                    reps,
                    weightKg: loadKg,
                    rpe,
                    restSeconds: 90,
                  })
                }
                className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-[1.4rem] bg-[#4cb894] px-5 py-3 text-base font-semibold text-slate-950 transition hover:bg-[#63c7a5]"
              >
                Check de serie
              </button>
            </article>

            <article className="min-w-0 rounded-[1.8rem] border border-white/10 bg-white/6 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-white/45">Plan de la rutina</p>
              <div className="mt-4 grid max-h-[28rem] gap-3 overflow-y-auto pr-1">
                {draft.entries.map((entry, currentEntryIndex) => (
                  <div key={`${entry.slug}-${currentEntryIndex}`} className="rounded-[1.3rem] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{entry.name}</p>
                        <p className="mt-1 text-xs text-white/50">
                          {entry.sets.length} sets · {entry.primaryMuscle}
                        </p>
                      </div>
                      {currentEntryIndex === entryIndex ? (
                        <span className="rounded-full bg-[#4cb894] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-950">
                          activo
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.sets.map((set, currentSetIndex) => {
                        const done = completedSets.some(
                          (item) =>
                            item.entryIndex === currentEntryIndex && item.setIndex === currentSetIndex,
                        );
                        const active =
                          currentEntryIndex === entryIndex && currentSetIndex === setIndex;

                        return (
                          <button
                            key={`${entry.slug}-set-${currentSetIndex}`}
                            type="button"
                            onClick={() => selectSet(currentEntryIndex, currentSetIndex)}
                            className={`rounded-full px-3 py-2 text-xs uppercase tracking-[0.14em] transition ${
                              done
                                ? "bg-emerald-500/20 text-emerald-100"
                                : active
                                  ? "bg-[#4cb894] text-slate-950"
                                  : "border border-white/10 bg-white/6 text-white/70 hover:bg-white/10"
                            }`}
                          >
                            S{currentSetIndex + 1} · {set.reps ?? "—"}x{set.weightKg ?? "—"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}
      </div>
    </main>
  );
}
