"use client";

import {
  trainingHistoryResponseSchema,
  trainingSessionSaveResponseSchema,
  type ClientProfile,
  type MuscleGroupSlug,
  type PersistedTrainingSessionSummary,
  type TrainingSessionDraft,
  type TrainingSessionEntry,
  type WorkoutDraftSet,
} from "@musculator/contracts";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { LabExerciseListItem } from "@/lib/lab/persistence";

interface LabSessionsBoardProps {
  clients: ClientProfile[];
  initialClientId: string | null;
  initialHistory: PersistedTrainingSessionSummary[];
  exerciseCatalog: LabExerciseListItem[];
  initialStorage: "supabase" | "noop";
}

interface CalendarCell {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
  sessionCount: number;
}

interface RankedExerciseOption {
  exercise: LabExerciseListItem;
  score: number;
  recentIndex: number;
}

const weekdayLabels = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const knownMuscleSlugs: MuscleGroupSlug[] = [
  "dorsal",
  "trapecio",
  "deltoides-anterior",
  "deltoides-lateral",
  "pectoral",
  "biceps",
  "triceps",
  "cuadriceps",
  "femoral",
  "gluteo",
  "core",
  "pantorrilla",
];
const knownMuscleSlugSet = new Set<string>(knownMuscleSlugs);
const exercisePickerRecentStorageKey = "lab-sessions-recent-exercises";

function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase();
}

function humanizeTag(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function stimulusVectorLabel(value: LabExerciseListItem["stimulusVector"]) {
  if (value === "cardio_metabolico") {
    return "Cardio metabolico";
  }

  return humanizeTag(value);
}

function rankExercise(
  exercise: LabExerciseListItem,
  query: string,
  recentIndex: number,
): RankedExerciseOption | null {
  const name = normalizeSearchTerm(exercise.name);
  const muscle = normalizeSearchTerm(exercise.primaryMuscle.name);
  const movement = normalizeSearchTerm(humanizeTag(exercise.movementPattern));
  const stimulus = normalizeSearchTerm(stimulusVectorLabel(exercise.stimulusVector));
  const equipment = normalizeSearchTerm(exercise.equipment);
  const slug = normalizeSearchTerm(exercise.slug);
  let score = 0;

  if (!query) {
    score = recentIndex >= 0 ? 500 - recentIndex * 10 : 0;
  } else {
    if (name === query) {
      score += 240;
    } else if (name.startsWith(query)) {
      score += 180;
    } else if (name.includes(query)) {
      score += 120;
    }

    if (muscle.includes(query)) {
      score += 90;
    }

    if (movement.includes(query)) {
      score += 70;
    }

    if (stimulus.includes(query)) {
      score += 70;
    }

    if (equipment.includes(query)) {
      score += 50;
    }

    if (slug.includes(query)) {
      score += 45;
    }

    if (recentIndex >= 0) {
      score += Math.max(40 - recentIndex, 8);
    }
  }

  if (query && score === 0) {
    return null;
  }

  return {
    exercise,
    score,
    recentIndex,
  };
}

function getDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function parseDateKey(value: string) {
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date(value);
  }

  return new Date(year, month - 1, day);
}

function formatDayLabel(value: string) {
  return parseDateKey(value).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function toDateTimeInputValue(value: string | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoFromDateTimeInput(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function withDateApplied(day: Date, currentIso: string | undefined) {
  const base = currentIso ? new Date(currentIso) : new Date();

  if (Number.isNaN(base.getTime())) {
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 18, 0, 0, 0).toISOString();
  }

  const composed = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    base.getHours(),
    base.getMinutes(),
    0,
    0,
  );

  return composed.toISOString();
}

function buildMonthCells(anchorMonth: Date, sessionsByDay: Map<string, PersistedTrainingSessionSummary[]>) {
  const monthStart = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth(), 1);
  const monthEnd = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() + 1, 0);
  const offsetToMonday = (monthStart.getDay() + 6) % 7;
  const totalCells = Math.ceil((offsetToMonday + monthEnd.getDate()) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(monthStart);
    date.setDate(monthStart.getDate() - offsetToMonday + index);
    const dateKey = getDateKey(date);
    const sessionCount = sessionsByDay.get(dateKey)?.length ?? 0;

    return {
      date,
      dateKey,
      inCurrentMonth: date.getMonth() === monthStart.getMonth(),
      sessionCount,
    } satisfies CalendarCell;
  });
}

function normalizeMuscleSlug(candidate: string | undefined, fallback: MuscleGroupSlug = "core") {
  if (!candidate) {
    return fallback;
  }

  return knownMuscleSlugSet.has(candidate) ? (candidate as MuscleGroupSlug) : fallback;
}

function parseOptionalPositiveInt(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(Math.round(parsed), 1);
}

function parseOptionalNonNegative(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(Math.round(parsed * 10) / 10, 0);
}

function createDefaultSet(): WorkoutDraftSet {
  return {
    reps: 10,
    weightKg: 40,
    rpe: 8,
  };
}

function createDraftSession(): TrainingSessionDraft {
  return {
    title: "Sesion manual",
    startedAt: new Date().toISOString(),
    notes: "",
    entries: [],
    recoveryInputs: {
      sleepHours: 7.5,
      carbsTargetRatio: 0.9,
      hydrationTargetRatio: 0.85,
    },
  };
}

function toSessionEntry(exercise: LabExerciseListItem): TrainingSessionEntry {
  const primaryMuscle = normalizeMuscleSlug(exercise.primaryMuscle.slug, "core");
  const secondaryMuscles = exercise.synergistMuscles
    .map((muscle) => normalizeMuscleSlug(muscle.slug, primaryMuscle))
    .filter((slug, index, source) => slug !== primaryMuscle && source.indexOf(slug) === index);

  return {
    slug: exercise.slug,
    name: exercise.name,
    category: exercise.category,
    movementPattern: exercise.movementPattern as TrainingSessionEntry["movementPattern"],
    primaryMuscle,
    secondaryMuscles,
    stimulusVector: exercise.stimulusVector as TrainingSessionEntry["stimulusVector"],
    resistanceProfile: exercise.resistanceProfile as TrainingSessionEntry["resistanceProfile"],
    isCompound: exercise.isCompound,
    equipment: exercise.equipment,
    cnsTaxMultiplier: exercise.cnsTaxMultiplier,
    recoveryTimeHours: Math.max(Math.round(exercise.recoveryTimeHours), 1),
    sets: [createDefaultSet()],
    notes: "",
  };
}

function describeCalendarTone(sessionCount: number) {
  if (sessionCount >= 3) {
    return "bg-emerald-500/70";
  }

  if (sessionCount === 2) {
    return "bg-emerald-400/55";
  }

  if (sessionCount === 1) {
    return "bg-emerald-300/45";
  }

  return "bg-slate-50/90";
}

export function LabSessionsBoard({
  clients,
  initialClientId,
  initialHistory,
  exerciseCatalog,
  initialStorage,
}: LabSessionsBoardProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId);
  const [history, setHistory] = useState<PersistedTrainingSessionSummary[]>(initialHistory);
  const [storageMode, setStorageMode] = useState<"supabase" | "noop">(initialStorage);
  const [calendarAnchor, setCalendarAnchor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDayKey, setSelectedDayKey] = useState(getDateKey(new Date()));
  const [draft, setDraft] = useState<TrainingSessionDraft>(() => createDraftSession());
  const [selectedExerciseSlug, setSelectedExerciseSlug] = useState(exerciseCatalog[0]?.slug ?? "");
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [recentExerciseSlugs, setRecentExerciseSlugs] = useState<string[]>([]);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [highlightedExerciseIndex, setHighlightedExerciseIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();
  const exercisePickerRef = useRef<HTMLDivElement | null>(null);

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const exerciseBySlug = useMemo(
    () => new Map(exerciseCatalog.map((exercise) => [exercise.slug, exercise])),
    [exerciseCatalog],
  );
  const normalizedExerciseQuery = useMemo(() => normalizeSearchTerm(exerciseSearchQuery), [exerciseSearchQuery]);
  const rankedExerciseOptions = useMemo(() => {
    const ranked = exerciseCatalog
      .map((exercise) => {
        const recentIndex = recentExerciseSlugs.indexOf(exercise.slug);
        return rankExercise(exercise, normalizedExerciseQuery, recentIndex);
      })
      .filter((option): option is RankedExerciseOption => option !== null)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        if (left.recentIndex >= 0 && right.recentIndex >= 0 && left.recentIndex !== right.recentIndex) {
          return left.recentIndex - right.recentIndex;
        }

        if (left.recentIndex >= 0 && right.recentIndex < 0) {
          return -1;
        }

        if (left.recentIndex < 0 && right.recentIndex >= 0) {
          return 1;
        }

        return left.exercise.name.localeCompare(right.exercise.name, "es");
      });

    return ranked.slice(0, 80);
  }, [exerciseCatalog, normalizedExerciseQuery, recentExerciseSlugs]);
  const highlightedExercise = rankedExerciseOptions[highlightedExerciseIndex]?.exercise ?? null;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(exercisePickerRecentStorageKey);

      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return;
      }

      setRecentExerciseSlugs(parsed.filter((item): item is string => typeof item === "string").slice(0, 8));
    } catch {
      // Ignore malformed localStorage payloads and continue with empty recents.
    }
  }, []);

  useEffect(() => {
    if (!isExercisePickerOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (exercisePickerRef.current?.contains(target)) {
        return;
      }

      setIsExercisePickerOpen(false);
    };

    window.addEventListener("mousedown", onPointerDown);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [isExercisePickerOpen]);

  useEffect(() => {
    const firstOption = rankedExerciseOptions[0];

    setHighlightedExerciseIndex((current) => {
      if (rankedExerciseOptions.length === 0) {
        return 0;
      }

      return Math.min(current, rankedExerciseOptions.length - 1);
    });

    if (rankedExerciseOptions.length === 0) {
      return;
    }

    if (firstOption && !rankedExerciseOptions.some((option) => option.exercise.slug === selectedExerciseSlug)) {
      setSelectedExerciseSlug(firstOption.exercise.slug);
    }
  }, [rankedExerciseOptions, selectedExerciseSlug]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStatusMessage(null);
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [statusMessage]);

  const sessionsByDay = useMemo(() => {
    return history.reduce((accumulator, session) => {
      const key = getDateKey(session.startedAt);
      const current = accumulator.get(key) ?? [];

      if (!current.some((item) => item.sessionId === session.sessionId)) {
        current.push(session);
        accumulator.set(key, current);
      }

      return accumulator;
    }, new Map<string, PersistedTrainingSessionSummary[]>());
  }, [history]);

  const monthCells = useMemo(
    () => buildMonthCells(calendarAnchor, sessionsByDay),
    [calendarAnchor, sessionsByDay],
  );

  const selectedDaySessions = useMemo(() => {
    return [...(sessionsByDay.get(selectedDayKey) ?? [])].sort((left, right) => {
      return new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime();
    });
  }, [selectedDayKey, sessionsByDay]);

  const refreshHistory = async (clientId: string | null) => {
    if (!clientId) {
      setHistory([]);
      return;
    }

    const response = await fetch(
      `/api/training/sessions?clientId=${encodeURIComponent(clientId)}&limit=160`,
      {
        cache: "no-store",
      },
    );
    const raw = (await response.json()) as unknown;

    if (!response.ok) {
      const message =
        typeof raw === "object" && raw && "error" in raw && typeof raw.error === "string"
          ? raw.error
          : "No se pudo cargar el historial de sesiones.";

      throw new Error(message);
    }

    const parsed = trainingHistoryResponseSchema.parse(raw);
    setHistory(parsed.sessions);
    setStorageMode(parsed.storage);
  };

  const updateDraft = (updater: (current: TrainingSessionDraft) => TrainingSessionDraft) => {
    setDraft((current) => updater(current));
  };

  const updateEntry = (
    entryIndex: number,
    updater: (current: TrainingSessionEntry) => TrainingSessionEntry,
  ) => {
    updateDraft((current) => ({
      ...current,
      entries: current.entries.map((entry, index) => (index === entryIndex ? updater(entry) : entry)),
    }));
  };

  const addExerciseToDraft = (requestedSlug?: string) => {
    const resolvedSlug = requestedSlug ?? highlightedExercise?.slug ?? selectedExerciseSlug;
    const exercise = exerciseBySlug.get(resolvedSlug);

    if (!exercise) {
      return;
    }

    updateDraft((current) => ({
      ...current,
      entries: [...current.entries, toSessionEntry(exercise)],
    }));

    setRecentExerciseSlugs((current) => {
      const next = [exercise.slug, ...current.filter((item) => item !== exercise.slug)].slice(0, 8);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(exercisePickerRecentStorageKey, JSON.stringify(next));
      }

      return next;
    });

    setSelectedExerciseSlug(exercise.slug);
    setExerciseSearchQuery("");
    setHighlightedExerciseIndex(0);
    setIsExercisePickerOpen(false);
  };

  const onExercisePickerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isExercisePickerOpen) {
        setIsExercisePickerOpen(true);
        return;
      }

      setHighlightedExerciseIndex((current) => {
        if (rankedExerciseOptions.length === 0) {
          return 0;
        }

        return (current + 1) % rankedExerciseOptions.length;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!isExercisePickerOpen) {
        setIsExercisePickerOpen(true);
        return;
      }

      setHighlightedExerciseIndex((current) => {
        if (rankedExerciseOptions.length === 0) {
          return 0;
        }

        return (current - 1 + rankedExerciseOptions.length) % rankedExerciseOptions.length;
      });
      return;
    }

    if (event.key === "Enter") {
      if (!isExercisePickerOpen || !highlightedExercise) {
        return;
      }

      event.preventDefault();
      addExerciseToDraft(highlightedExercise.slug);
      return;
    }

    if (event.key === "Escape") {
      if (!isExercisePickerOpen) {
        return;
      }

      event.preventDefault();
      setIsExercisePickerOpen(false);
      setHighlightedExerciseIndex(0);
    }
  };

  const removeEntry = (entryIndex: number) => {
    updateDraft((current) => ({
      ...current,
      entries: current.entries.filter((_, index) => index !== entryIndex),
    }));
  };

  const addSet = (entryIndex: number) => {
    updateEntry(entryIndex, (entry) => ({
      ...entry,
      sets: [...entry.sets, createDefaultSet()],
    }));
  };

  const removeSet = (entryIndex: number, setIndex: number) => {
    updateEntry(entryIndex, (entry) => ({
      ...entry,
      sets:
        entry.sets.length <= 1 ? entry.sets : entry.sets.filter((_, currentIndex) => currentIndex !== setIndex),
    }));
  };

  const onClientChange = (value: string) => {
    const nextClientId = value || null;
    setSelectedClientId(nextClientId);
    setError(null);
    setStatusMessage(null);

    startRefreshTransition(() => {
      void (async () => {
        try {
          await refreshHistory(nextClientId);
        } catch (caughtError) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "No se pudo cargar el historial del cliente.",
          );
        }
      })();
    });
  };

  const onSaveSession = () => {
    startSavingTransition(() => {
      void (async () => {
        try {
          setError(null);
          setStatusMessage(null);

          if (!selectedClientId) {
            throw new Error("Selecciona un cliente antes de guardar la sesion.");
          }

          if (draft.entries.length === 0) {
            throw new Error("Agrega al menos un ejercicio al constructor de sesion.");
          }

          const response = await fetch("/api/training/sessions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-client-id": selectedClientId,
            },
            body: JSON.stringify(draft),
          });
          const raw = (await response.json()) as unknown;

          if (!response.ok) {
            const message =
              typeof raw === "object" && raw && "error" in raw && typeof raw.error === "string"
                ? raw.error
                : "No se pudo guardar la sesion.";

            throw new Error(message);
          }

          const parsed = trainingSessionSaveResponseSchema.parse(raw);
          await refreshHistory(selectedClientId);

          setStorageMode(parsed.storage);
          setStatusMessage(
            parsed.storage === "supabase"
              ? `Sesion guardada en ${parsed.savedAt ? formatDateTime(parsed.savedAt) : "timestamp valido"}.`
              : "Sesion validada en modo preview (sin persistencia Supabase).",
          );

          updateDraft((current) => ({
            ...current,
            entries: [],
          }));
          setExerciseSearchQuery("");
          setIsExercisePickerOpen(false);
          setHighlightedExerciseIndex(0);
        } catch (caughtError) {
          setError(caughtError instanceof Error ? caughtError.message : "No se pudo guardar la sesion.");
        }
      })();
    });
  };

  const goToMonth = (delta: number) => {
    setCalendarAnchor((current) => {
      return new Date(current.getFullYear(), current.getMonth() + delta, 1);
    });
  };

  if (!hasMounted) {
    return <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]" />;
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(20,33,43,0.06)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Sesiones</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">Calendario de entrenamientos</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              Se pinta automaticamente por actividad diaria. Desde aca puedes cargar sesiones que no registraste en el LIVE.
            </p>
          </div>
          <div className="grid gap-2 text-sm text-[var(--muted)] sm:min-w-[16rem]">
            <label className="grid gap-2">
              Cliente activo
              <select
                value={selectedClientId ?? ""}
                onChange={(event) => onClientChange(event.target.value)}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
              >
                {clients.length === 0 ? <option value="">Sin clientes</option> : null}
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.fullName}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Storage: {storageMode}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.4rem] border border-[var(--border)] bg-white/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 text-sm font-medium text-[var(--ink)] transition hover:bg-slate-100"
            >
              Mes anterior
            </button>
            <p className="text-sm font-semibold capitalize text-[var(--ink)]">
              {calendarAnchor.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 text-sm font-medium text-[var(--ink)] transition hover:bg-slate-100"
            >
              Mes siguiente
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {monthCells.map((cell) => {
              const active = cell.dateKey === selectedDayKey;
              const tone = describeCalendarTone(cell.sessionCount);
              const dayNumberTone =
                cell.sessionCount >= 2
                  ? "text-white"
                  : cell.sessionCount === 1
                    ? "text-emerald-950"
                    : "text-slate-700";

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => {
                    setSelectedDayKey(cell.dateKey);
                    updateDraft((current) => ({
                      ...current,
                      startedAt: withDateApplied(cell.date, current.startedAt),
                    }));
                  }}
                  className={`relative min-h-14 rounded-xl border border-slate-300/90 text-sm transition ${tone} ${
                    cell.inCurrentMonth ? "" : "opacity-45"
                  } ${active ? "ring-2 ring-slate-950" : "hover:border-slate-400/50"}`}
                  aria-label={`${cell.dateKey}: ${cell.sessionCount} sesiones`}
                >
                  <span className={`text-sm font-semibold ${dayNumberTone}`}>{cell.date.getDate()}</span>
                  {cell.sessionCount > 0 ? (
                    <span className="absolute bottom-1 right-1 rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] font-medium">
                      {cell.sessionCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-[1.4rem] border border-[var(--border)] bg-white/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--ink)]">
              {selectedDayKey ? formatDayLabel(selectedDayKey) : "Selecciona un dia"}
            </p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                startRefreshTransition(() => {
                  void (async () => {
                    try {
                      await refreshHistory(selectedClientId);
                    } catch (caughtError) {
                      setError(
                        caughtError instanceof Error
                          ? caughtError.message
                          : "No se pudo refrescar el historial.",
                      );
                    }
                  })();
                });
              }}
              disabled={isRefreshing}
              className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--border)] bg-white px-3 text-xs font-medium text-[var(--ink)] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshing ? "Actualizando..." : "Refrescar"}
            </button>
          </div>

          <div className="mt-3 grid gap-2">
            {selectedDaySessions.length > 0 ? (
              selectedDaySessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-sm text-[var(--ink)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{session.title}</p>
                    <span className="text-xs text-[var(--muted)]">{formatDateTime(session.startedAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {session.totalSets} sets · {Math.round(session.totalLoadKg)} kg · RPE medio {session.averageRpe}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-white/80 px-3 py-4 text-sm text-[var(--muted)]">
                No hay sesiones registradas para este dia.
              </div>
            )}
          </div>
        </div>
      </article>

      <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(20,33,43,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Constructor</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">Carga sesion retroactiva</h2>
          </div>
          <button
            type="button"
            onClick={onSaveSession}
            disabled={isSaving}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Guardando..." : "Guardar sesion"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-[var(--muted)] sm:col-span-2">
            Titulo de sesion
            <input
              value={draft.title}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)] sm:col-span-2">
            Fecha y hora
            <input
              type="datetime-local"
              max={toDateTimeInputValue(new Date().toISOString())}
              value={toDateTimeInputValue(draft.startedAt)}
              onChange={(event) => {
                const iso = toIsoFromDateTimeInput(event.target.value);

                if (!iso) {
                  return;
                }

                updateDraft((current) => ({
                  ...current,
                  startedAt: iso,
                }));
                setSelectedDayKey(getDateKey(iso));
              }}
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Sueno
            <input
              type="number"
              min="0"
              max="12"
              step="0.1"
              value={draft.recoveryInputs.sleepHours}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  recoveryInputs: {
                    ...current.recoveryInputs,
                    sleepHours: Number(event.target.value),
                  },
                }))
              }
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Carbos target
            <input
              type="number"
              min="0"
              max="1.5"
              step="0.05"
              value={draft.recoveryInputs.carbsTargetRatio}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  recoveryInputs: {
                    ...current.recoveryInputs,
                    carbsTargetRatio: Number(event.target.value),
                  },
                }))
              }
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)] sm:col-span-2">
            Hidratacion target
            <input
              type="number"
              min="0"
              max="1.5"
              step="0.05"
              value={draft.recoveryInputs.hydrationTargetRatio}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  recoveryInputs: {
                    ...current.recoveryInputs,
                    hydrationTargetRatio: Number(event.target.value),
                  },
                }))
              }
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)] sm:col-span-2">
            Notas
            <textarea
              value={draft.notes ?? ""}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              rows={3}
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
            />
          </label>
        </div>

        <div className="mt-5 rounded-[1.2rem] border border-[var(--border)] bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Agregar ejercicios</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div ref={exercisePickerRef} className="relative flex-1">
              <input
                value={exerciseSearchQuery}
                onFocus={() => setIsExercisePickerOpen(true)}
                onChange={(event) => {
                  setExerciseSearchQuery(event.target.value);
                  setIsExercisePickerOpen(true);
                  setHighlightedExerciseIndex(0);
                }}
                onKeyDown={onExercisePickerKeyDown}
                placeholder="Busca por ejercicio, musculo, patron o vector"
                className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
              />

              {isExercisePickerOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 max-h-72 overflow-y-auto rounded-xl border border-slate-300 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.2)]">
                  {rankedExerciseOptions.length > 0 ? (
                    rankedExerciseOptions.map((option, index) => {
                      const active = highlightedExerciseIndex === index;
                      const recent = option.recentIndex >= 0;

                      return (
                        <button
                          key={option.exercise.slug}
                          type="button"
                          onClick={() => addExerciseToDraft(option.exercise.slug)}
                          onMouseEnter={() => setHighlightedExerciseIndex(index)}
                          className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition ${
                            active ? "bg-slate-950 text-white" : "text-[var(--ink)] hover:bg-slate-100"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{option.exercise.name}</span>
                            <span className={`block truncate text-xs ${active ? "text-white/75" : "text-[var(--muted)]"}`}>
                              {option.exercise.primaryMuscle.name} · {humanizeTag(option.exercise.movementPattern)}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            {recent ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                Reciente
                              </span>
                            ) : null}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                active ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-900"
                              }`}
                            >
                              {stimulusVectorLabel(option.exercise.stimulusVector)}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-lg px-3 py-2 text-sm text-[var(--muted)]">
                      No hay ejercicios que coincidan con tu busqueda.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => addExerciseToDraft()}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-900/20 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              + Agregar
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {draft.entries.length > 0 ? (
            draft.entries.map((entry, entryIndex) => (
              <div key={`${entry.slug}-${entryIndex}`} className="rounded-[1.2rem] border border-[var(--border)] bg-white/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--ink)]">{entry.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {entry.equipment} · recovery {entry.recoveryTimeHours}h · cns {entry.cnsTaxMultiplier}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addSet(entryIndex)}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--border)] bg-white px-3 text-xs font-medium text-[var(--ink)] transition hover:bg-slate-100"
                    >
                      + Set
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEntry(entryIndex)}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-rose-300/40 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Quitar
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  {entry.sets.map((set, setIndex) => (
                    <div key={`${entry.slug}-${entryIndex}-set-${setIndex}`} className="grid gap-2 rounded-xl border border-[var(--border)] bg-white p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                      <label className="grid gap-1 text-xs text-[var(--muted)]">
                        Kg
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={set.weightKg ?? ""}
                          onChange={(event) =>
                            updateEntry(entryIndex, (current) => ({
                              ...current,
                              sets: current.sets.map((currentSet, currentSetIndex) => {
                                if (currentSetIndex !== setIndex) {
                                  return currentSet;
                                }

                                return {
                                  ...currentSet,
                                  weightKg: parseOptionalNonNegative(event.target.value),
                                };
                              }),
                            }))
                          }
                          className="rounded-lg border border-[var(--border)] bg-white px-2 py-2 text-sm text-[var(--ink)] outline-none"
                        />
                      </label>

                      <label className="grid gap-1 text-xs text-[var(--muted)]">
                        Reps
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={set.reps ?? ""}
                          onChange={(event) =>
                            updateEntry(entryIndex, (current) => ({
                              ...current,
                              sets: current.sets.map((currentSet, currentSetIndex) => {
                                if (currentSetIndex !== setIndex) {
                                  return currentSet;
                                }

                                return {
                                  ...currentSet,
                                  reps: parseOptionalPositiveInt(event.target.value),
                                };
                              }),
                            }))
                          }
                          className="rounded-lg border border-[var(--border)] bg-white px-2 py-2 text-sm text-[var(--ink)] outline-none"
                        />
                      </label>

                      <label className="grid gap-1 text-xs text-[var(--muted)]">
                        RPE
                        <input
                          type="number"
                          min="1"
                          max="10"
                          step="1"
                          value={set.rpe ?? ""}
                          onChange={(event) =>
                            updateEntry(entryIndex, (current) => ({
                              ...current,
                              sets: current.sets.map((currentSet, currentSetIndex) => {
                                if (currentSetIndex !== setIndex) {
                                  return currentSet;
                                }

                                const parsed = parseOptionalPositiveInt(event.target.value);

                                return {
                                  ...currentSet,
                                  rpe: parsed ? Math.min(parsed, 10) : undefined,
                                };
                              }),
                            }))
                          }
                          className="rounded-lg border border-[var(--border)] bg-white px-2 py-2 text-sm text-[var(--ink)] outline-none"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => removeSet(entryIndex, setIndex)}
                        disabled={entry.sets.length <= 1}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--border)] bg-white px-3 text-xs font-medium text-[var(--ink)] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Quitar set
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-[var(--border)] bg-white/70 px-4 py-5 text-sm text-[var(--muted)]">
              No hay ejercicios todavia. Agrega uno para armar la sesion retroactiva.
            </div>
          )}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-300/35 bg-rose-50 px-3 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {selectedClient ? (
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            Cliente activo: {selectedClient.fullName}
          </p>
        ) : null}
      </article>

      {statusMessage ? (
        <div className="pointer-events-none fixed bottom-24 right-4 z-40 max-w-sm rounded-xl border border-emerald-300/45 bg-emerald-100/95 px-4 py-3 text-sm font-medium text-emerald-900 shadow-[0_16px_30px_rgba(20,83,45,0.22)]">
          {statusMessage}
        </div>
      ) : null}
    </section>
  );
}
