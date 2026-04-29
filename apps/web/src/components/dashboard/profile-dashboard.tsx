"use client";

import Link from "next/link";
import { useGlobalOverlay } from "@/components/overlays/global-overlay-provider";

const profileCards = [
  { label: "Readiness", value: "82", tone: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200" },
  { label: "Estado metabólico", value: "2800 kcal", tone: "border-sky-400/25 bg-sky-500/10 text-sky-200" },
  { label: "Semana actual", value: "3/6", tone: "border-amber-400/25 bg-amber-500/10 text-amber-200" },
];

export function ProfileDashboard() {
  const { openDialog, openSheet } = useGlobalOverlay();

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[2rem] border border-white/8 bg-[#09111b] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.35)] md:p-8">
          <div className="flex items-start justify-between gap-4">
            <button
              type="button"
              onClick={() =>
                openSheet({
                  title: "Ajustar biometría",
                  description:
                    "Este slide-over queda reservado para editar peso, altura, edad, contexto y métricas base sin abandonar el dashboard.",
                  content: (
                    <div className="grid gap-3 text-sm text-white/70">
                      <div className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">Peso actual, altura, edad y notas del perfil.</div>
                      <div className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">Más adelante se conecta a biometría persistida en Supabase.</div>
                    </div>
                  ),
                })
              }
              className="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4 text-left transition hover:bg-white/10"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-emerald-400 bg-[#0d1724] text-xl font-semibold">
                PR
              </div>
              <div>
                <p className="text-2xl font-semibold">Perfil del atleta</p>
                <p className="mt-1 text-sm text-white/60">27 años · 1.75 m · 78.0 kg</p>
              </div>
            </button>

            <Link
              href="/session/demo"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#4cb894] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#63c7a5]"
            >
              Iniciar sesión
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {profileCards.map((card) => (
              <div key={card.label} className={`rounded-[1.4rem] border p-4 ${card.tone}`}>
                <p className="text-xs uppercase tracking-[0.18em] opacity-75">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/6 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-white/45">Sugerencia de hoy</p>
            <p className="mt-3 text-lg font-medium text-white">
              Toca espalda con amplitud. Cuádriceps y glúteos siguen en recuperación por la última sesión de pierna.
            </p>
          </div>
        </article>

        <article className="grid gap-6">
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(20,33,43,0.06)]">
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Radar biomecánico</p>
            <div className="mt-5 rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-5 text-sm leading-7 text-[var(--muted)]">
              Placeholder funcional para la huella deportiva acumulada. Esta zona queda solo de lectura en Dashboard.
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(20,33,43,0.06)]">
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Ruta segura</p>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Acá analizás, revisás y decidís. No editás series ni cambiás ejercicios en caliente.
            </p>
          </div>
        </article>
      </section>

      <button
        type="button"
        onClick={() =>
          openDialog({
            title: "Registrar comida o calorías",
            description:
              "Este modal central queda listo para carga rápida de fotos, gramos o calorías sin salir del dashboard.",
            content: (
              <div className="grid gap-3 text-sm text-white/70">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">Foto del plato o input manual.</div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">Al guardar, se actualizará la barra metabólica en segundo plano.</div>
              </div>
            ),
          })
        }
        className="fixed right-4 bottom-24 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-2xl font-semibold text-white shadow-[0_18px_40px_rgba(0,0,0,0.22)] transition hover:bg-slate-800 xl:right-8 xl:bottom-8"
        aria-label="Registrar comida"
      >
        +
      </button>
    </div>
  );
}