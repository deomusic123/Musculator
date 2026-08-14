"use client";

import { trainingTemplateBlueprintSchema, type TrainingTemplateBlueprint, type TrainingTemplateExercise } from "@musculator/contracts";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { LabExerciseListResponse } from "@/lib/lab/persistence";
import {
  type LabTemplateDetailResponse,
  type LabTemplateListResponse,
  type LabTemplateSaveResponse,
  type LabTemplateSummary,
} from "@/lib/lab/template-persistence";

interface TemplateBuilderProps {
  initialTemplates: LabTemplateListResponse;
  initialExercises: LabExerciseListResponse;
  initialTemplate?: LabTemplateDetailResponse | null;
}

function toOneDecimal(value: number) {
  return Number(value.toFixed(1));
}

function normalizeEntries(entries: TrainingTemplateExercise[]) {
  return entries.map((entry, index) => {
    const targetSets = Math.max(entry.targetSets, 1);
    const currentSets = entry.setTargets
      .slice()
      .sort((left, right) => left.setIndex - right.setIndex)
      .slice(0, targetSets);

    while (currentSets.length < targetSets) {
      currentSets.push({
        setIndex: currentSets.length + 1,
        targetRepsMin: entry.targetRepsMin,
        targetRepsMax: entry.targetRepsMax,
        targetWeightKg: entry.targetWeightKg,
        targetDurationSeconds: entry.targetDurationSeconds,
        targetRpe: entry.targetRpe,
        notes: entry.notes,
      });
    }

    return {
      ...entry,
      sequenceIndex: index,
      targetSets,
      setTargets: currentSets.map((set, setIndex) => ({
        ...set,
        setIndex: setIndex + 1,
      })),
    };
  });
}

function templateId() {
  return `tmpl-${Math.random().toString(36).slice(2, 10)}`;
}

function buildDraftTemplate(
  id: string,
  exerciseSlug: string | undefined,
  exerciseLookup: Map<string, LabExerciseListResponse["exercises"][number]>,
): TrainingTemplateBlueprint {
  const resolvedSlug = exerciseSlug ?? Array.from(exerciseLookup.keys())[0];
  const exercise = resolvedSlug ? exerciseLookup.get(resolvedSlug) : undefined;

  return {
    id,
    name: "Nuevo template",
    description: "",
    sessionKind: "strength",
    goal: "",
    entries: [
      {
        exerciseSlug: resolvedSlug,
        rawExerciseName: exercise?.name,
        sequenceIndex: 0,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 8,
        targetWeightKg: undefined,
        targetDurationSeconds: undefined,
        targetRpe: 8,
        stimulusVector: exercise?.stimulusVector,
        notes: "",
        setTargets: [
          {
            setIndex: 1,
            targetRepsMin: 8,
            targetRepsMax: 8,
            targetWeightKg: undefined,
            targetDurationSeconds: undefined,
            targetRpe: 8,
            notes: "",
          },
        ],
      },
    ],
  };
}

function getEntryLabel(entry: TrainingTemplateExercise, namesBySlug: Map<string, string>) {
  if (entry.exerciseSlug) {
    return namesBySlug.get(entry.exerciseSlug) ?? entry.exerciseSlug;
  }

  return entry.rawExerciseName ?? "Ejercicio sin nombre";
}

export function TemplateBuilder({
  initialTemplates,
  initialExercises,
  initialTemplate = null,
}: TemplateBuilderProps) {
  const initialExerciseLookup = useMemo(
    () => new Map(initialExercises.exercises.map((exercise) => [exercise.slug, exercise])),
    [initialExercises.exercises],
  );

  const [templates, setTemplates] = useState<LabTemplateSummary[]>(initialTemplates.templates);
  const [template, setTemplate] = useState<TrainingTemplateBlueprint>(() => {
    if (initialTemplate?.template) {
      return initialTemplate.template;
    }

    return buildDraftTemplate(templateId(), initialExercises.exercises[0]?.slug, initialExerciseLookup);
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    initialTemplate?.template.id ?? initialTemplates.templates[0]?.id ?? null,
  );
  const [selectedExerciseSlug, setSelectedExerciseSlug] = useState(initialExercises.exercises[0]?.slug ?? "");
  const [storageMode, setStorageMode] = useState<"supabase" | "noop">(
    initialTemplate?.storage ?? initialTemplates.storage,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedEntryIndex, setDraggedEntryIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const skipInitialTemplateFetch = useRef(initialTemplate?.template.id ?? null);

  const exerciseBySlug = useMemo(
    () => new Map(initialExercises.exercises.map((exercise) => [exercise.slug, exercise])),
    [initialExercises.exercises],
  );

  const exerciseNameBySlug = useMemo(
    () => new Map(initialExercises.exercises.map((exercise) => [exercise.slug, exercise.name])),
    [initialExercises.exercises],
  );

  const estimatedNeuralCost = useMemo(() => {
    return toOneDecimal(
      template.entries.reduce((sum, entry) => {
        const cnsTax = entry.exerciseSlug ? exerciseBySlug.get(entry.exerciseSlug)?.cnsTaxMultiplier ?? 0 : 0;
        return sum + entry.targetSets * cnsTax;
      }, 0),
    );
  }, [exerciseBySlug, template.entries]);

  useEffect(() => {
    if (!selectedTemplateId) {
      return;
    }

    if (skipInitialTemplateFetch.current === selectedTemplateId) {
      skipInitialTemplateFetch.current = null;
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/lab/templates/${selectedTemplateId}`);
          const payload = (await response.json()) as LabTemplateDetailResponse | { error: string };

          if (!response.ok || !("template" in payload)) {
            throw new Error("error" in payload ? payload.error : "No se pudo cargar el template seleccionado.");
          }

          setTemplate(payload.template);
          setStorageMode(payload.storage);
          setLoadError(null);
        } catch (caughtError) {
          setLoadError(
            caughtError instanceof Error
              ? caughtError.message
              : "No se pudo cargar el template seleccionado.",
          );
        }
      })();
    });
  }, [selectedTemplateId]);

  const refreshTemplateList = async () => {
    const response = await fetch("/api/lab/templates", {
      cache: "no-store",
    });
    const payload = (await response.json()) as LabTemplateListResponse | { error: string };

    if (!response.ok || !("templates" in payload)) {
      throw new Error("error" in payload ? payload.error : "No se pudo refrescar el listado de templates.");
    }

    setTemplates(payload.templates);
    setStorageMode(payload.storage);
  };

  const createNewDraft = () => {
    setSelectedTemplateId(null);
    setTemplate(
      buildDraftTemplate(
        templateId(),
        selectedExerciseSlug || initialExercises.exercises[0]?.slug,
        initialExerciseLookup,
      ),
    );
    setStatusMessage("Draft nuevo creado. Ajusta entradas y guardalo para persistir.");
    setLoadError(null);
  };

  const updateTemplate = (updater: (current: TrainingTemplateBlueprint) => TrainingTemplateBlueprint) => {
    setTemplate((current) => {
      const next = updater(current);
      return {
        ...next,
        entries: normalizeEntries(next.entries),
      };
    });
  };

  const addExerciseEntry = () => {
    if (!selectedExerciseSlug) {
      return;
    }

    const exercise = exerciseBySlug.get(selectedExerciseSlug);

    updateTemplate((current) => ({
      ...current,
      entries: [
        ...current.entries,
        {
          exerciseSlug: selectedExerciseSlug,
          rawExerciseName: exercise?.name,
          sequenceIndex: current.entries.length,
          targetSets: 3,
          targetRepsMin: 8,
          targetRepsMax: 8,
          targetWeightKg: undefined,
          targetDurationSeconds: undefined,
          targetRpe: 8,
          stimulusVector: exercise?.stimulusVector,
          notes: "",
          setTargets: [
            {
              setIndex: 1,
              targetRepsMin: 8,
              targetRepsMax: 8,
              targetWeightKg: undefined,
              targetDurationSeconds: undefined,
              targetRpe: 8,
              notes: "",
            },
          ],
        },
      ],
    }));
  };

  const removeEntry = (index: number) => {
    if (template.entries.length <= 1) {
      setStatusMessage("El template necesita al menos una entrada.");
      return;
    }

    updateTemplate((current) => ({
      ...current,
      entries: current.entries.filter((_, entryIndex) => entryIndex !== index),
    }));
  };

  const moveEntry = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= template.entries.length ||
      toIndex >= template.entries.length
    ) {
      return;
    }

    updateTemplate((current) => {
      const nextEntries = [...current.entries];
      const [moved] = nextEntries.splice(fromIndex, 1);

      if (!moved) {
        return current;
      }

      nextEntries.splice(toIndex, 0, moved);

      return {
        ...current,
        entries: nextEntries,
      };
    });
  };

  const saveTemplate = async () => {
    setIsSaving(true);
    setLoadError(null);
    setStatusMessage(null);

    try {
      const payload = trainingTemplateBlueprintSchema.parse({
        ...template,
        id: selectedTemplateId ?? template.id,
      });

      const endpoint = selectedTemplateId ? `/api/lab/templates/${selectedTemplateId}` : "/api/lab/templates";
      const method = selectedTemplateId ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as LabTemplateSaveResponse | { error: string };

      if (!response.ok || !("template" in body)) {
        throw new Error("error" in body ? body.error : "No se pudo guardar el template.");
      }

      const wasForkedFromSystem = Boolean(selectedTemplateId && body.template.id !== selectedTemplateId);
      setTemplate(body.template);
      setSelectedTemplateId(body.template.id);
      setStorageMode(body.storage);
      await refreshTemplateList();
      setStatusMessage(
        body.saveStatus === "saved"
          ? wasForkedFromSystem
            ? "Template del sistema guardado como copia editable propia."
            : "Template guardado y sincronizado con la base de datos."
          : "Template validado en modo preview (sin persistencia Supabase).",
      );
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : "No se pudo guardar el template.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
      <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(20,33,43,0.06)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Templates</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">Constructor de rutinas</h2>
          </div>
          <button
            type="button"
            onClick={createNewDraft}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Nuevo
          </button>
        </div>

        <div className="mt-4 rounded-[1.2rem] border border-[var(--border)] bg-white/70 px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Storage: {storageMode}
        </div>

        <div className="mt-5 grid gap-3">
          {templates.length > 0 ? (
            templates.map((item) => {
              const active = selectedTemplateId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId(item.id);
                    setStatusMessage(null);
                  }}
                  className={`grid gap-2 rounded-[1.2rem] border px-4 py-4 text-left transition ${
                    active
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-[var(--border)] bg-white/70 text-[var(--ink)] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{item.name}</p>
                    <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${active ? "bg-white/15" : "bg-slate-950 text-white"}`}>
                      {item.sessionKind}
                    </span>
                  </div>
                  <div className={`flex flex-wrap items-center gap-3 text-xs ${active ? "text-white/75" : "text-[var(--muted)]"}`}>
                    <span>Entradas: {item.entryCount}</span>
                    <span>CNS Estimado: {item.estimatedNeuralCost.toFixed(1)}</span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-[var(--border)] bg-white/60 px-4 py-6 text-sm text-[var(--muted)]">
              No hay templates guardados todavia. Crea uno con el boton Nuevo.
            </div>
          )}
        </div>
      </article>

      <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(20,33,43,0.06)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Nombre
            <input
              value={template.name}
              onChange={(event) => updateTemplate((current) => ({ ...current, name: event.target.value }))}
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Session kind
            <select
              value={template.sessionKind}
              onChange={(event) =>
                updateTemplate((current) => ({
                  ...current,
                  sessionKind: event.target.value as TrainingTemplateBlueprint["sessionKind"],
                }))
              }
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
            >
              <option value="strength">strength</option>
              <option value="conditioning">conditioning</option>
              <option value="hybrid">hybrid</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)] sm:col-span-2">
            Objetivo
            <input
              value={template.goal ?? ""}
              onChange={(event) => updateTemplate((current) => ({ ...current, goal: event.target.value }))}
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)] sm:col-span-2">
            Descripcion
            <textarea
              value={template.description}
              onChange={(event) => updateTemplate((current) => ({ ...current, description: event.target.value }))}
              className="min-h-[92px] rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
            />
          </label>
        </div>

        <div className="mt-6 rounded-[1.2rem] border border-slate-900/20 bg-slate-900 px-4 py-4 text-white">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/65">Costo neural estimado</p>
          <p className="mt-2 text-3xl font-semibold">{estimatedNeuralCost.toFixed(1)}</p>
          <p className="mt-1 text-xs text-white/60">Formula: suma de (sets objetivo x cns_tax_multiplier) por ejercicio.</p>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-3">
          <label className="grid min-w-[240px] flex-1 gap-2 text-sm text-[var(--muted)]">
            Agregar ejercicio
            <select
              value={selectedExerciseSlug}
              onChange={(event) => setSelectedExerciseSlug(event.target.value)}
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
            >
              {initialExercises.exercises.map((exercise) => (
                <option key={exercise.slug} value={exercise.slug}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={addExerciseEntry}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-900 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Agregar
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {template.entries.map((entry, index) => {
            const cnsTax = entry.exerciseSlug ? exerciseBySlug.get(entry.exerciseSlug)?.cnsTaxMultiplier ?? 0 : 0;
            const neuralCost = toOneDecimal(entry.targetSets * cnsTax);
            const isDragging = draggedEntryIndex === index;
            const isDropTarget =
              draggedEntryIndex !== null && dropTargetIndex === index && draggedEntryIndex !== index;

            return (
              <div
                key={`${entry.exerciseSlug ?? "raw"}-${index}`}
                draggable={template.entries.length > 1}
                onDragStart={() => {
                  setDraggedEntryIndex(index);
                  setDropTargetIndex(index);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (draggedEntryIndex !== null && draggedEntryIndex !== index) {
                    setDropTargetIndex(index);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedEntryIndex !== null) {
                    moveEntry(draggedEntryIndex, index);
                  }
                  setDraggedEntryIndex(null);
                  setDropTargetIndex(null);
                }}
                onDragEnd={() => {
                  setDraggedEntryIndex(null);
                  setDropTargetIndex(null);
                }}
                className={`rounded-[1.2rem] border bg-white/70 p-4 transition ${
                  isDragging
                    ? "cursor-grabbing border-slate-900/40 opacity-70"
                    : isDropTarget
                      ? "cursor-grab border-slate-900/40 ring-2 ring-slate-900/15"
                      : "cursor-grab border-[var(--border)]"
                }`}
                title="Arrastrá la card para reordenar"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="select-none text-base text-slate-400">⋮⋮</span>
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                      {index + 1}. {getEntryLabel(entry, exerciseNameBySlug)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => removeEntry(index)}
                      className="inline-flex min-h-9 items-center justify-center rounded-full border border-rose-400 px-3 py-1 text-xs font-semibold text-rose-500"
                    >
                      Quitar
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_120px]">
                  <label className="grid min-w-0 gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                    Sets
                    <input
                      type="number"
                      min={1}
                      max={20}
                      step={1}
                      inputMode="numeric"
                      value={entry.targetSets}
                      onChange={(event) => {
                        const nextSets = Math.max(1, Number(event.target.value) || 1);
                        updateTemplate((current) => ({
                          ...current,
                          entries: current.entries.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  targetSets: nextSets,
                                }
                              : item,
                          ),
                        }));
                      }}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium tabular-nums text-slate-900 outline-none transition [appearance:textfield] focus:border-slate-900/35 focus:ring-2 focus:ring-slate-900/10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </label>

                  <label className="grid min-w-0 gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                    Reps min
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={entry.targetRepsMin ?? ""}
                      onChange={(event) => {
                        const value = event.target.value ? Number(event.target.value) : undefined;
                        updateTemplate((current) => ({
                          ...current,
                          entries: current.entries.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  targetRepsMin: value,
                                }
                              : item,
                          ),
                        }));
                      }}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium tabular-nums text-slate-900 outline-none transition [appearance:textfield] focus:border-slate-900/35 focus:ring-2 focus:ring-slate-900/10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </label>

                  <label className="grid min-w-0 gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                    Reps max
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={entry.targetRepsMax ?? ""}
                      onChange={(event) => {
                        const value = event.target.value ? Number(event.target.value) : undefined;
                        updateTemplate((current) => ({
                          ...current,
                          entries: current.entries.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  targetRepsMax: value,
                                }
                              : item,
                          ),
                        }));
                      }}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium tabular-nums text-slate-900 outline-none transition [appearance:textfield] focus:border-slate-900/35 focus:ring-2 focus:ring-slate-900/10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </label>

                  <label className="grid min-w-0 gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                    RPE
                    <input
                      type="number"
                      min={1}
                      max={10}
                      step={0.5}
                      inputMode="decimal"
                      value={entry.targetRpe ?? ""}
                      onChange={(event) => {
                        const value = event.target.value ? Number(event.target.value) : undefined;
                        updateTemplate((current) => ({
                          ...current,
                          entries: current.entries.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  targetRpe: value,
                                }
                              : item,
                          ),
                        }));
                      }}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium tabular-nums text-slate-900 outline-none transition [appearance:textfield] focus:border-slate-900/35 focus:ring-2 focus:ring-slate-900/10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </label>

                  <div className="grid min-w-0 gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                    Costo CNS
                    <p className="flex h-12 items-center rounded-xl border border-slate-900/20 bg-slate-900 px-3 text-sm font-semibold tabular-nums text-white">
                      {neuralCost.toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveTemplate}
            disabled={isSaving || isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Guardando..." : "Guardar template"}
          </button>

          {statusMessage ? <p className="text-sm text-emerald-600">{statusMessage}</p> : null}
          {loadError ? <p className="text-sm text-rose-600">{loadError}</p> : null}
        </div>
      </article>
    </section>
  );
}
