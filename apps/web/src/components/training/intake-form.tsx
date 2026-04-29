"use client";

import {
  trainingIngestionRequestSchema,
  type TrainingIngestionResponse,
  type WorkoutIntakePayload,
  type WorkoutSource,
} from "@musculator/contracts";
import { useState, useTransition } from "react";

interface TrainingIntakeFormProps {
  defaultPayload: WorkoutIntakePayload;
  persistenceEnabled: boolean;
}

export function TrainingIntakeForm({
  defaultPayload,
  persistenceEnabled,
}: TrainingIntakeFormProps) {
  const [rawInput, setRawInput] = useState(
    "Hice 4x10 de remo con barra pesado RPE 9 y despues 5 rounds de saco de 3 minutos.",
  );
  const [source, setSource] = useState<WorkoutSource>("text");
  const [attachStructuredPayload, setAttachStructuredPayload] = useState(true);
  const [result, setResult] = useState<TrainingIngestionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const requestBody = trainingIngestionRequestSchema.parse({
          source,
          rawInput,
          parsedPayload: attachStructuredPayload ? defaultPayload : undefined,
          sessionStartedAt: new Date().toISOString(),
        });

        const response = await fetch("/api/training/intake", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = (await response.json()) as TrainingIngestionResponse | { error?: string };

        if (!response.ok) {
          throw new Error("error" in data ? data.error ?? "No se pudo procesar la ingesta." : "No se pudo procesar la ingesta.");
        }

        if (!("status" in data)) {
          throw new Error("La respuesta del backend no tiene el contrato esperado.");
        }

        setResult(data);
      } catch (caughtError) {
        setResult(null);
        setError(caughtError instanceof Error ? caughtError.message : "Error inesperado.");
      }
    });
  };

  return (
    <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">
            Ingesta training
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Ruta segura hacia training_ingestions</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            El preview funciona sin auth. Si mas adelante activas sesion y Supabase, esta misma ruta puede persistir el raw input y el payload estructurado sin cambiar la UI.
          </p>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-white/70 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
          {persistenceEnabled ? "persistencia habilitada" : "preview sin auth"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm text-[var(--muted)]">
          Reporte informal
          <textarea
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            rows={5}
            className="rounded-[1.5rem] border border-[var(--border)] bg-white/80 px-4 py-3 text-base text-[var(--ink)] outline-none transition focus:border-slate-900"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-[0.34fr_0.66fr]">
          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Source
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as WorkoutSource)}
              className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-base text-[var(--ink)] outline-none transition focus:border-slate-900"
            >
              <option value="manual">manual</option>
              <option value="text">text</option>
              <option value="audio">audio</option>
              <option value="import">import</option>
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-[1.5rem] border border-[var(--border)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              checked={attachStructuredPayload}
              onChange={(event) => setAttachStructuredPayload(event.target.checked)}
              className="h-4 w-4"
            />
            Adjuntar el payload estructurado actual del builder para validar el contrato extremo a extremo.
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 md:w-fit"
        >
          {isPending ? "Procesando..." : "Enviar ingesta"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/80 p-4">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Resultado</p>
            <div className="mt-3 grid gap-2 text-sm text-[var(--ink)]">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span className="font-medium">{result.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Storage</span>
                <span className="font-medium">{result.storage}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>n8n</span>
                <span className="font-medium">{result.n8nForwarded ? "forwarded" : "pending/off"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--border)] bg-slate-950 p-4 text-slate-100">
            <p className="text-sm uppercase tracking-[0.2em] text-white/60">Summary</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white/8 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Entries</p>
                <p className="mt-2 text-2xl font-semibold">{result.summary.entryCount}</p>
              </div>
              <div className="rounded-2xl bg-white/8 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Total sets</p>
                <p className="mt-2 text-2xl font-semibold">{result.summary.totalSets}</p>
              </div>
              <div className="rounded-2xl bg-white/8 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Peak RPE</p>
                <p className="mt-2 text-2xl font-semibold">{result.summary.peakRpe}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}