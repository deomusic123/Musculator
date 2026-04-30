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
  const [reps, setReps] = useState(8);
  const [loadKg, setLoadKg] = useState(70);
  const [rpe, setRpe] = useState(8);
  const sessionIdInStore = useLiveSessionStore((state) => state.sessionId);
  const startedAtMs = useLiveSessionStore((state) => state.startedAtMs);
  const pausedAtMs = useLiveSessionStore((state) => state.pausedAtMs);
  const pausedAccumulatedMs = useLiveSessionStore((state) => state.pausedAccumulatedMs);
  const activeSetId = useLiveSessionStore((state) => state.activeSetId);
  const isPaused = useLiveSessionStore((state) => state.isPaused);
  const initializeSession = useLiveSessionStore((state) => state.initializeSession);
  const togglePause = useLiveSessionStore((state) => state.togglePause);
  const setActiveSetId = useLiveSessionStore((state) => state.setActiveSetId);
  const resetSession = useLiveSessionStore((state) => state.resetSession);

  useEffect(() => {
    initializeSession(sessionId);
  }, [initializeSession, sessionId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const elapsedSeconds = useMemo(() => {
    if (!startedAtMs) {
      return 0;
    }

    const nowAnchor = isPaused && pausedAtMs ? pausedAtMs : clockNow;
    const elapsedMs = nowAnchor - startedAtMs - pausedAccumulatedMs;

    return Math.max(Math.floor(elapsedMs / 1000), 0);
  }, [clockNow, isPaused, pausedAccumulatedMs, pausedAtMs, startedAtMs]);

  const activeSetDisplay = activeSetId ?? "set-1";

  return (
    <main className="min-h-[100svh] overflow-x-hidden bg-[#05080f] px-3 py-3 text-white sm:px-4 sm:py-4">
      <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] max-w-5xl flex-col justify-between rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(76,184,148,0.16),transparent_0_30%),#08111a] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:min-h-[calc(100svh-2rem)] sm:p-6 md:p-8">
        <section className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-white/45">Instancia de combate</p>
            <h1 className="mt-3 text-3xl font-semibold md:text-5xl">Modo guerra aislado</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
              Ruta independiente sin navegación global. Sesión: {sessionId}. Estado persistido: {sessionIdInStore === sessionId ? "activo" : "rehidratando"}.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Abortar
            </Link>
            <button
              type="button"
              onClick={() => {
                resetSession();
                initializeSession(sessionId);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#4cb894] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#63c7a5]"
            >
              Reset live
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-[1.8rem] border border-white/10 bg-white/6 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-white/45">Cronómetro</p>
            <p className="mt-6 text-7xl font-semibold tracking-tight">{formatDuration(elapsedSeconds)}</p>
            <p className="mt-3 text-sm text-white/55">Set activo: {activeSetDisplay.toUpperCase().replace("-", " ")}</p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={togglePause}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                {isPaused ? "Reanudar" : "Pausar"}
              </button>
              <span className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/55">
                {isPaused ? "paused" : "running"}
              </span>
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-white/10 bg-white/6 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-white/45">Controles táctiles</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: 6 }, (_, index) => {
                const setId = `set-${index + 1}`;
                const active = activeSetId === setId;

                return (
                  <button
                    key={setId}
                    type="button"
                    onClick={() => setActiveSetId(setId)}
                    className={`rounded-full px-3 py-2 text-xs uppercase tracking-[0.18em] transition ${
                      active
                        ? "bg-[#4cb894] text-slate-950"
                        : "border border-white/10 bg-black/25 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {setId}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">Reps</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button type="button" onClick={() => setReps((value) => Math.max(value - 1, 1))} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl">-</button>
                  <span className="text-2xl font-semibold">{reps}</span>
                  <button type="button" onClick={() => setReps((value) => Math.min(value + 1, 30))} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl">+</button>
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">Carga</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button type="button" onClick={() => setLoadKg((value) => Math.max(value - 2.5, 0))} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl">-</button>
                  <span className="text-2xl font-semibold">{loadKg}</span>
                  <button type="button" onClick={() => setLoadKg((value) => Math.min(value + 2.5, 400))} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl">+</button>
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">RPE</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button type="button" onClick={() => setRpe((value) => Math.max(value - 1, 1))} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl">-</button>
                  <span className="text-2xl font-semibold">{rpe}</span>
                  <button type="button" onClick={() => setRpe((value) => Math.min(value + 1, 10))} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl">+</button>
                </div>
              </div>
            </div>

            <button className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-[1.4rem] bg-[#4cb894] px-5 py-3 text-base font-semibold text-slate-950 transition hover:bg-[#63c7a5]">
              Check de serie
            </button>
          </article>
        </section>
      </div>
    </main>
  );
}
