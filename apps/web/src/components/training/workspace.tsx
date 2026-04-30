"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  clientCreateResponseSchema,
  clientListResponseSchema,
  trainingHistoryResponseSchema,
  trainingSessionSaveResponseSchema,
  type ClientProfile,
  type PersistedTrainingSessionSummary,
  type TrainingSessionDraft,
  type WorkoutDraftSet,
} from "@musculator/contracts";
import {
  analyzeTrainingSession,
  compressTrainingSessionToWorkoutIntakePayload,
  createEntryFromCatalog,
  createTrainingTemplateSession,
  trainingExerciseCatalog,
  trainingTemplates,
} from "@musculator/domain";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { EmbeddedExerciseCatalog } from "@/components/lab/embedded-exercise-catalog";
import { useGlobalOverlay } from "@/components/overlays/global-overlay-provider";
import type { SetupCheck } from "@/lib/platform/setup";
import { TrainingIntakeForm } from "./intake-form";

const readinessTone = {
  green: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
  amber: "border-amber-400/30 bg-amber-500/15 text-amber-200",
  red: "border-rose-400/30 bg-rose-500/15 text-rose-200",
};

const muscleTone = {
  low: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  moderate: "border-amber-400/20 bg-amber-500/10 text-amber-100",
  high: "border-rose-400/20 bg-rose-500/10 text-rose-100",
};

const stimulusLabel = {
  amplitud: "Amplitud",
  densidad: "Densidad",
  fuerza: "Fuerza",
  cardio_metabolico: "Cardio metabolico",
  acondicionamiento: "Acondicionamiento",
  potencia: "Potencia",
};

const catalogCategories = Array.from(
  new Set(trainingExerciseCatalog.map((exercise) => exercise.category)),
);

const connectionTone = {
  supabase: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
  noop: "border-amber-400/30 bg-amber-500/15 text-amber-200",
};

const readinessPalette = {
  green: {
    solid: "#4cb894",
    soft: "rgba(76,184,148,0.18)",
    label: "Listo para empujar",
  },
  amber: {
    solid: "#f59e0b",
    soft: "rgba(245,158,11,0.18)",
    label: "Fatiga media",
  },
  red: {
    solid: "#fb7185",
    soft: "rgba(251,113,133,0.18)",
    label: "Fatiga alta",
  },
};

const heatmapTone = {
  none: "border-white/6 bg-white/[0.04]",
  strength1: "border-emerald-400/12 bg-emerald-900/55",
  strength2: "border-emerald-400/18 bg-emerald-700/70",
  strength3: "border-emerald-300/30 bg-emerald-500/75",
  conditioning1: "border-orange-400/12 bg-orange-900/55",
  conditioning2: "border-orange-400/18 bg-orange-700/70",
  conditioning3: "border-orange-300/30 bg-orange-500/75",
  mixed1: "border-sky-400/12 bg-sky-900/55",
  mixed2: "border-sky-400/18 bg-sky-700/70",
  mixed3: "border-sky-300/30 bg-sky-500/75",
};

const anatomyTone = {
  low: {
    fill: "rgba(71, 85, 105, 0.35)",
    stroke: "rgba(148, 163, 184, 0.28)",
  },
  moderate: {
    fill: "rgba(245, 158, 11, 0.55)",
    stroke: "rgba(253, 224, 71, 0.6)",
  },
  high: {
    fill: "rgba(244, 63, 94, 0.62)",
    stroke: "rgba(253, 164, 175, 0.72)",
  },
  none: {
    fill: "rgba(71, 85, 105, 0.16)",
    stroke: "rgba(148, 163, 184, 0.12)",
  },
};

function getDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isConditioningSession(title: string) {
  return /(box|boxeo|saco|cardio|metabol|hiit|round)/i.test(title);
}

function extractMetricFromNotes(notes: string | undefined, pattern: RegExp, fallback: number) {
  if (!notes) {
    return fallback;
  }

  const match = notes.match(pattern);

  if (!match || !match[1]) {
    return fallback;
  }

  const normalized = Number(match[1].replace(",", "."));

  return Number.isFinite(normalized) ? normalized : fallback;
}

function buildConsistencyHeatmap(history: PersistedTrainingSessionSummary[]) {
  const sessionsByDay = history.reduce(
    (accumulator, session) => {
      const key = getDateKey(session.startedAt);
      const current = accumulator.get(key) ?? [];
      current.push(session);
      accumulator.set(key, current);
      return accumulator;
    },
    new Map<string, PersistedTrainingSessionSummary[]>(),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(today.getDate() - 83);

  return Array.from({ length: 84 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateKey = getDateKey(date);
    const sessions = sessionsByDay.get(dateKey) ?? [];
    const totalSets = sessions.reduce((sum, item) => sum + item.totalSets, 0);
    const conditioningCount = sessions.filter((item) => isConditioningSession(item.title)).length;
    const mode: "none" | "conditioning" | "mixed" | "strength" =
      sessions.length === 0
        ? "none"
        : conditioningCount === sessions.length
          ? "conditioning"
          : conditioningCount > 0
            ? "mixed"
            : "strength";
    const intensity =
      sessions.length === 0 ? 0 : totalSets >= 16 || sessions.length >= 2 ? 3 : totalSets >= 8 ? 2 : 1;

    return {
      date,
      dateKey,
      sessions,
      totalSets,
      mode,
      intensity,
    };
  });
}

function inferBiomechanicalAxes(history: PersistedTrainingSessionSummary[]) {
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - 30);

  const totals = {
    verticalPull: 0,
    horizontalPull: 0,
    push: 0,
    posteriorChain: 0,
    conditioning: 0,
  };

  history
    .filter((session) => new Date(session.startedAt) >= limitDate)
    .forEach((session) => {
      const title = session.title.toLowerCase();
      const dorsalLoad = session.topMuscles
        .filter((muscle) => muscle.muscleSlug === "dorsal" || muscle.muscleSlug === "biceps")
        .reduce((sum, muscle) => sum + muscle.totalSets, 0);
      const horizontalLoad = session.topMuscles
        .filter((muscle) => muscle.muscleSlug === "trapecio" || muscle.muscleSlug === "dorsal")
        .reduce((sum, muscle) => sum + muscle.totalSets, 0);
      const pushLoad = session.topMuscles
        .filter(
          (muscle) =>
            muscle.muscleSlug === "pectoral" ||
            muscle.muscleSlug === "triceps" ||
            muscle.muscleSlug === "deltoides-anterior",
        )
        .reduce((sum, muscle) => sum + muscle.totalSets, 0);
      const posteriorLoad = session.topMuscles
        .filter(
          (muscle) =>
            muscle.muscleSlug === "femoral" ||
            muscle.muscleSlug === "gluteo" ||
            muscle.muscleSlug === "core" ||
            muscle.muscleSlug === "trapecio",
        )
        .reduce((sum, muscle) => sum + muscle.totalSets, 0);

      totals.verticalPull += dorsalLoad + (/pull|jalon|amplitud/.test(title) ? session.totalSets * 0.4 : 0);
      totals.horizontalPull += horizontalLoad + (/remo|row|densidad/.test(title) ? session.totalSets * 0.4 : 0);
      totals.push += pushLoad + (/push|press|pecho|hombro/.test(title) ? session.totalSets * 0.45 : 0);
      totals.posteriorChain += posteriorLoad + (/pierna|posterior|deadlift|rumano|glute/.test(title) ? session.totalSets * 0.45 : 0);
      totals.conditioning += isConditioningSession(session.title) ? Math.max(session.totalSets, 6) : 0;
    });

  const maxValue = Math.max(...Object.values(totals), 1);

  return [
    { key: "verticalPull", label: "Traccion vertical", value: Math.round((totals.verticalPull / maxValue) * 100) },
    { key: "horizontalPull", label: "Traccion horizontal", value: Math.round((totals.horizontalPull / maxValue) * 100) },
    { key: "push", label: "Empuje", value: Math.round((totals.push / maxValue) * 100) },
    { key: "posteriorChain", label: "Cadena posterior", value: Math.round((totals.posteriorChain / maxValue) * 100) },
    { key: "conditioning", label: "Acondicionamiento", value: Math.round((totals.conditioning / maxValue) * 100) },
  ];
}

function getHeatmapCellTone(mode: "none" | "conditioning" | "mixed" | "strength", intensity: number) {
  if (intensity === 0 || mode === "none") {
    return heatmapTone.none;
  }

  if (mode === "conditioning") {
    return intensity >= 3 ? heatmapTone.conditioning3 : intensity === 2 ? heatmapTone.conditioning2 : heatmapTone.conditioning1;
  }

  if (mode === "mixed") {
    return intensity >= 3 ? heatmapTone.mixed3 : intensity === 2 ? heatmapTone.mixed2 : heatmapTone.mixed1;
  }

  return intensity >= 3 ? heatmapTone.strength3 : intensity === 2 ? heatmapTone.strength2 : heatmapTone.strength1;
}

function getRadarPolygon(values: number[], radius: number, center: number) {
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / values.length;
      const scaledRadius = (radius * value) / 100;
      const x = center + Math.cos(angle) * scaledRadius;
      const y = center + Math.sin(angle) * scaledRadius;
      return `${x},${y}`;
    })
    .join(" ");
}

function getRadarGridPolygon(steps: number, step: number, radius: number, center: number) {
  return Array.from({ length: steps }, (_, index) => ((index + 1) / step) * 100).map((value) =>
    getRadarPolygon(Array.from({ length: step }, () => value), radius, center),
  );
}

function BiomechanicalRadar({
  axes,
}: {
  axes: Array<{ key: string; label: string; value: number }>;
}) {
  const center = 120;
  const radius = 78;

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr] lg:items-center">
      <svg viewBox="0 0 240 240" className="mx-auto h-[240px] w-[240px] overflow-visible">
        {getRadarGridPolygon(4, axes.length, radius, center).map((polygon, index) => (
          <polygon
            key={polygon}
            points={polygon}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={index === 3 ? 1.4 : 1}
          />
        ))}
        {axes.map((axis, index) => {
          const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
          const x = center + Math.cos(angle) * (radius + 18);
          const y = center + Math.sin(angle) * (radius + 18);

          return (
            <line
              key={axis.key}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="1"
            />
          );
        })}
        <polygon
          points={getRadarPolygon(axes.map((axis) => axis.value), radius, center)}
          fill="rgba(76,184,148,0.24)"
          stroke="#4cb894"
          strokeWidth="2"
        />
        {axes.map((axis, index) => {
          const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
          const x = center + Math.cos(angle) * ((radius * axis.value) / 100);
          const y = center + Math.sin(angle) * ((radius * axis.value) / 100);

          return <circle key={`${axis.key}-dot`} cx={x} cy={y} r="4" fill="#9cf3d3" />;
        })}
      </svg>

      <div className="grid gap-3">
        {axes.map((axis) => (
          <div key={axis.key} className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{axis.label}</p>
              <span className="text-sm font-semibold text-[#9cf3d3]">{axis.value}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-black/30">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#4cb894] via-[#65c7a8] to-[#8df2ce]"
                style={{ width: `${Math.max(axis.value, 8)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnatomyHeatmap({
  muscles,
}: {
  muscles: Array<{
    muscle: string;
    label: string;
    tone: keyof typeof muscleTone;
    totalSets: number;
    recoveryTimeHours: number;
  }>;
}) {
  const muscleMap = new Map(muscles.map((muscle) => [muscle.muscle, muscle]));

  const getTone = (slug: string) => anatomyTone[muscleMap.get(slug)?.tone ?? "none"];

  const Region = ({ slug, children }: { slug: string; children: ReactNode }) => {
    const tone = getTone(slug);

    return (
      <g fill={tone.fill} stroke={tone.stroke} strokeWidth="2">
        {children}
      </g>
    );
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-[1.8rem] border border-white/10 bg-[#071019] p-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">Frente</p>
        <svg viewBox="0 0 160 280" className="mt-3 h-[280px] w-full">
          <circle cx="80" cy="28" r="20" fill="rgba(255,255,255,0.08)" />
          <rect x="60" y="50" width="40" height="70" rx="18" fill="rgba(255,255,255,0.06)" />
          <rect x="66" y="120" width="28" height="38" rx="12" fill="rgba(255,255,255,0.05)" />
          <rect x="46" y="60" width="14" height="92" rx="8" fill="rgba(255,255,255,0.05)" />
          <rect x="100" y="60" width="14" height="92" rx="8" fill="rgba(255,255,255,0.05)" />
          <rect x="62" y="160" width="18" height="78" rx="10" fill="rgba(255,255,255,0.05)" />
          <rect x="80" y="160" width="18" height="78" rx="10" fill="rgba(255,255,255,0.05)" />

          <Region slug="deltoides-anterior">
            <circle cx="56" cy="65" r="12" />
            <circle cx="104" cy="65" r="12" />
          </Region>
          <Region slug="pectoral">
            <ellipse cx="68" cy="86" rx="16" ry="18" />
            <ellipse cx="92" cy="86" rx="16" ry="18" />
          </Region>
          <Region slug="biceps">
            <rect x="44" y="78" width="13" height="34" rx="7" />
            <rect x="103" y="78" width="13" height="34" rx="7" />
          </Region>
          <Region slug="triceps">
            <rect x="46" y="112" width="11" height="26" rx="6" />
            <rect x="103" y="112" width="11" height="26" rx="6" />
          </Region>
          <Region slug="core">
            <rect x="66" y="118" width="28" height="34" rx="12" />
          </Region>
          <Region slug="cuadriceps">
            <rect x="61" y="162" width="18" height="56" rx="9" />
            <rect x="81" y="162" width="18" height="56" rx="9" />
          </Region>
          <Region slug="pantorrilla">
            <rect x="63" y="220" width="14" height="34" rx="7" />
            <rect x="83" y="220" width="14" height="34" rx="7" />
          </Region>
        </svg>
      </div>

      <div className="rounded-[1.8rem] border border-white/10 bg-[#071019] p-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">Espalda</p>
        <svg viewBox="0 0 160 280" className="mt-3 h-[280px] w-full">
          <circle cx="80" cy="28" r="20" fill="rgba(255,255,255,0.08)" />
          <rect x="60" y="50" width="40" height="70" rx="18" fill="rgba(255,255,255,0.06)" />
          <rect x="66" y="120" width="28" height="38" rx="12" fill="rgba(255,255,255,0.05)" />
          <rect x="46" y="60" width="14" height="92" rx="8" fill="rgba(255,255,255,0.05)" />
          <rect x="100" y="60" width="14" height="92" rx="8" fill="rgba(255,255,255,0.05)" />
          <rect x="62" y="160" width="18" height="78" rx="10" fill="rgba(255,255,255,0.05)" />
          <rect x="80" y="160" width="18" height="78" rx="10" fill="rgba(255,255,255,0.05)" />

          <Region slug="trapecio">
            <path d="M60 60 L80 48 L100 60 L92 84 L68 84 Z" />
          </Region>
          <Region slug="dorsal">
            <path d="M56 82 C48 100 50 122 66 138 L74 120 L74 84 Z" />
            <path d="M104 82 C112 100 110 122 94 138 L86 120 L86 84 Z" />
          </Region>
          <Region slug="deltoides-lateral">
            <circle cx="56" cy="65" r="12" />
            <circle cx="104" cy="65" r="12" />
          </Region>
          <Region slug="gluteo">
            <ellipse cx="70" cy="164" rx="12" ry="14" />
            <ellipse cx="90" cy="164" rx="12" ry="14" />
          </Region>
          <Region slug="femoral">
            <rect x="61" y="178" width="18" height="48" rx="9" />
            <rect x="81" y="178" width="18" height="48" rx="9" />
          </Region>
          <Region slug="pantorrilla">
            <rect x="63" y="226" width="14" height="32" rx="7" />
            <rect x="83" y="226" width="14" height="32" rx="7" />
          </Region>
        </svg>
      </div>
    </div>
  );
}

function duplicateLastSet(sets: WorkoutDraftSet[]) {
  const lastSet = sets[sets.length - 1];

  return [
    ...sets,
    lastSet
      ? { ...lastSet }
      : {
          reps: 10,
          weightKg: 40,
          rpe: 8,
        },
  ];
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatRounded(value: number) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(totalSeconds % 60, 0)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function adjustMetric(
  current: number | undefined,
  delta: number,
  options: { min: number; max?: number; precision?: number },
) {
  const nextValue = (current ?? options.min) + delta;
  const clamped = Math.max(
    options.min,
    options.max !== undefined ? Math.min(nextValue, options.max) : nextValue,
  );

  if (options.precision === 1) {
    return Math.round(clamped * 10) / 10;
  }

  return Math.round(clamped);
}

function getSetKey(entryIndex: number, setIndex: number) {
  return `${entryIndex}-${setIndex}`;
}

function entrySignature(entryIndex: number, slug: string) {
  return `${slug}-${entryIndex}`;
}

function StepperPill({
  label,
  value,
  onDecrement,
  onIncrement,
  compact = false,
}: {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.2rem] border border-white/10 bg-white/5 p-2 ${
        compact ? "min-w-[92px]" : "min-w-[118px]"
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onDecrement}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl font-medium text-white transition hover:bg-slate-800"
        >
          -
        </button>
        <div className="flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-black/30 px-3 text-base font-semibold text-white">
          {value}
        </div>
        <button
          type="button"
          onClick={onIncrement}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl font-medium text-white transition hover:bg-slate-800"
        >
          +
        </button>
      </div>
    </div>
  );
}

interface TrainingWorkspaceProps {
  initialSession: TrainingSessionDraft;
  integrations: SetupCheck[];
  bootstrap?: TrainingWorkspaceBootstrapData;
  initialSurface?: DashboardSurface;
}

export interface TrainingWorkspaceBootstrapData {
  storageMode: "supabase" | "noop";
  clients: ClientProfile[];
  selectedClientId: string | null;
  history: PersistedTrainingSessionSummary[];
}

export type DashboardSurface = "profile" | "lab" | "nutrition" | "clients";

export function TrainingWorkspace({
  initialSession,
  integrations,
  bootstrap,
  initialSurface = "profile",
}: TrainingWorkspaceProps) {
  const router = useRouter();
  const { openSheet } = useGlobalOverlay();
  const [session, setSession] = useState(initialSession);
  const [mode, setMode] = useState<"dashboard" | "live">("dashboard");
  const [dashboardSurface, setDashboardSurface] = useState<DashboardSurface>(initialSurface);
  const [clients, setClients] = useState<ClientProfile[]>(bootstrap?.clients ?? []);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    bootstrap?.selectedClientId ?? null,
  );
  const [clientForm, setClientForm] = useState({
    fullName: "",
    goal: "",
    notes: "",
  });
  const [activeCategory, setActiveCategory] = useState(catalogCategories[0] ?? "Espalda");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [restSeconds, setRestSeconds] = useState(0);
  const [clockNow, setClockNow] = useState(Date.now());
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [collapsedEntries, setCollapsedEntries] = useState<Record<string, boolean>>({});
  const [isPending, startTemplateTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();
  const [isCreatingClient, startClientTransition] = useTransition();
  const [isRefreshingHistory, startHistoryTransition] = useTransition();
  const [history, setHistory] = useState<PersistedTrainingSessionSummary[]>(bootstrap?.history ?? []);
  const [storageMode, setStorageMode] = useState<"supabase" | "noop">(bootstrap?.storageMode ?? "noop");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<string | null>(null);
  const skippedBootstrapHistory = useRef(false);

  const deferredSession = useDeferredValue(session);
  const analysis = analyzeTrainingSession(deferredSession);
  const intakePayload = compressTrainingSessionToWorkoutIntakePayload(deferredSession);
  const persistenceEnabled = storageMode === "supabase";
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const latestSession = history[0];
  const readyIntegrations = integrations.filter((item) => item.ready).length;
  const elapsedSeconds = sessionStartedAt
    ? Math.max(Math.floor((clockNow - sessionStartedAt) / 1000), 0)
    : 0;
  const recentTitles = history.slice(0, 3).map((item) => item.title);
  const heatmapDays = buildConsistencyHeatmap(history);
  const activeHeatmapDay = heatmapDays.find((day) => day.dateKey === selectedHeatmapDay) ?? null;
  const recentActiveDays = heatmapDays.slice(-7).filter((day) => day.sessions.length > 0).length;
  const biomechanicalAxes = inferBiomechanicalAxes(history);
  const weakestBiomechanicalAxis = [...biomechanicalAxes].sort(
    (left, right) => left.value - right.value,
  )[0];
  const age = extractMetricFromNotes(selectedClient?.notes, /(\d{2})\s*(?:anos|a\b|años)/i, 27);
  const heightMeters = extractMetricFromNotes(selectedClient?.notes, /(1\.[4-9]\d?)\s*m/i, 1.75);
  const weightKg = extractMetricFromNotes(selectedClient?.notes, /(\d{2,3}(?:[\.,]\d)?)\s*kg/i, 78);
  const weeklyTrend = recentActiveDays >= 3 ? "alineada" : recentActiveDays > 0 ? "en construccion" : "sin traccion";
  const mesocycleWeek = selectedClient
    ? clamp(
        Math.ceil(
          (Date.now() - new Date(selectedClient.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 7),
        ),
        1,
        6,
      )
    : 1;
  const mesocycleLabel = selectedClient?.goal?.trim() || "Base general";
  const projectedIntakeKcal = Math.round(
    2200 +
      analysis.summary.totalSets * 22 +
      analysis.summary.totalLoadKg * 0.05 +
      session.recoveryInputs.carbsTargetRatio * 260 +
      session.recoveryInputs.hydrationTargetRatio * 140,
  );
  const targetIntakeKcal = selectedClient?.goal?.toLowerCase().includes("hipertrof")
    ? 3000
    : selectedClient?.goal?.toLowerCase().includes("fuerza")
      ? 2900
      : 2700;
  const intakeProgress = clamp(Math.round((projectedIntakeKcal / targetIntakeKcal) * 100), 0, 100);
  const focusMuscles = Array.from(
    history
      .flatMap((item) => item.topMuscles)
      .reduce((accumulator, muscle) => {
        const current = accumulator.get(muscle.muscleSlug) ?? {
          muscleName: muscle.muscleName,
          totalSets: 0,
          totalLoadKg: 0,
        };

        current.totalSets += muscle.totalSets;
        current.totalLoadKg += muscle.totalLoadKg;
        accumulator.set(muscle.muscleSlug, current);

        return accumulator;
      }, new Map<string, { muscleName: string; totalSets: number; totalLoadKg: number }>())
      .entries(),
  )
    .sort((left, right) => right[1].totalLoadKg - left[1].totalLoadKg)
    .slice(0, 4);
  const readinessScoreDisplay = (analysis.readiness.score / 10).toFixed(1);
  const weeklyWindowStart = new Date();
  weeklyWindowStart.setHours(0, 0, 0, 0);
  weeklyWindowStart.setDate(weeklyWindowStart.getDate() - 6);
  const weeklySessions = history.filter((item) => new Date(item.startedAt) >= weeklyWindowStart);
  const weeklyTotalLoad = weeklySessions.reduce((sum, item) => sum + item.totalLoadKg, 0);
  const recoveryCatalog = [...analysis.muscleLoad].sort(
    (left, right) => right.recoveryTimeHours - left.recoveryTimeHours || right.totalSets - left.totalSets,
  );
  const nextActionSuggestion = analysis.recommendations[0]
    ? analysis.recommendations[0]
    : "Todavía no hay una sugerencia prioritaria calculada para este bloque.";
  const athleteTitle = selectedClient?.fullName
    ? `PERFIL DEL ATLETA · ${selectedClient.fullName.toUpperCase()}`
    : "PERFIL DEL ATLETA · MODO PREVIEW";
  const selectDashboardSurface = (surface: DashboardSurface) => {
    setDashboardSurface(surface);
  };

  const openReadinessSheet = () => {
    openSheet({
      title: "Readiness SNC",
      description: "Lectura detallada del estado neural y de la agresividad sugerida para la sesión.",
      content: (
        <div className="grid gap-3 text-sm text-white/72">
          <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Score actual</p>
            <p className="mt-3 text-4xl font-semibold text-white">{analysis.readiness.score}</p>
            <p className="mt-2 text-sm text-white/58">{readinessPalette[analysis.readiness.status].label}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Penalidad central</p>
              <p className="mt-3 text-2xl font-semibold text-white">{formatRounded(analysis.readiness.centralPenalty)}</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Penalidad local</p>
              <p className="mt-3 text-2xl font-semibold text-white">{formatRounded(analysis.readiness.localPenalty)}</p>
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4 leading-7">
            Si el score cae, el sistema prioriza bajar agresividad, reducir fallo y usar la sesión live como ejecución guiada, no como exploración.
          </div>
        </div>
      ),
    });
  };

  const openMetabolicSheet = () => {
    openSheet({
      title: "Estado metabolico",
      description: "Desglose de la energía objetivo y del avance diario en recuperación nutricional.",
      content: (
        <div className="grid gap-3 text-sm text-white/72">
          <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Ingesta proyectada</p>
            <p className="mt-3 text-4xl font-semibold text-white">{projectedIntakeKcal}</p>
            <p className="mt-2 text-sm text-white/58">objetivo {targetIntakeKcal} kcal</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Carbos ratio</p>
              <p className="mt-3 text-2xl font-semibold text-white">{session.recoveryInputs.carbsTargetRatio.toFixed(2)}</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Hidratacion ratio</p>
              <p className="mt-3 text-2xl font-semibold text-white">{session.recoveryInputs.hydrationTargetRatio.toFixed(2)}</p>
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4 leading-7">
            Esta lectura mezcla tonelaje del draft, distribución de carbos y adherencia hídrica para estimar si hoy el bloque queda bien soportado.
          </div>
        </div>
      ),
    });
  };

  const openNextActionSheet = () => {
    openSheet({
      title: "Siguiente accion sugerida",
      description: "Resumen operativo para decidir el próximo estímulo sin salir de la app.",
      content: (
        <div className="grid gap-3 text-sm text-white/72">
          <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4 leading-7 text-white/82">
            {nextActionSuggestion}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Bloque actual</p>
              <p className="mt-3 text-xl font-semibold text-white">{session.title}</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Historial reciente</p>
              <p className="mt-3 text-sm leading-7 text-white">{recentTitles.join(" · ") || "Sin historial todavía."}</p>
            </div>
          </div>
        </div>
      ),
    });
  };

  const openAnatomySheet = () => {
    openSheet({
      title: "Mapa de calor anatómico",
      description: "Vista rápida de los grupos con mayor carga acumulada y su ventana de recuperación.",
      content: (
        <div className="grid gap-3 text-sm text-white/72">
          {recoveryCatalog.slice(0, 5).map((muscle) => (
            <div key={muscle.muscle} className={`rounded-[1.3rem] border p-4 ${muscleTone[muscle.tone]}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{muscle.label}</p>
                  <p className="text-sm opacity-75">{muscle.category}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.18em]">{muscle.recoveryTimeHours}h</span>
              </div>
            </div>
          ))}
        </div>
      ),
    });
  };

  const openRadarSheet = () => {
    openSheet({
      title: "Radar biomecánico",
      description: "Distribución del estímulo del último mes por ejes biomecánicos.",
      content: (
        <div className="grid gap-3 text-sm text-white/72">
          {biomechanicalAxes.map((axis) => (
            <div key={axis.key} className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-white">{axis.label}</p>
                <span className="text-sm text-white/58">{axis.value}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-black/30">
                <div className="h-2 rounded-full bg-[#4cb894]" style={{ width: `${Math.max(axis.value, 4)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ),
    });
  };

  const openConsistencySheet = () => {
    openSheet({
      title: "Mapa de calor de consistencia",
      description: "Actividad reciente para leer adherencia y continuidad del atleta.",
      content: (
        <div className="grid gap-3 text-sm text-white/72">
          <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Días activos últimos 7</p>
            <p className="mt-3 text-4xl font-semibold text-white">{recentActiveDays}</p>
          </div>
          {heatmapDays.slice(-7).map((day) => (
            <div key={day.dateKey} className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-white">{day.dateKey}</p>
                <span className="text-sm text-white/58">{day.sessions.length} sesiones</span>
              </div>
            </div>
          ))}
        </div>
      ),
    });
  };

  const filteredCatalog = trainingExerciseCatalog.filter((exercise) => {
    const matchesCategory = exercise.category === activeCategory;
    const normalizedQuery = catalogQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return matchesCategory;
    }

    return (
      matchesCategory &&
      (exercise.name.toLowerCase().includes(normalizedQuery) ||
        exercise.slug.toLowerCase().includes(normalizedQuery) ||
        exercise.primaryMuscle.toLowerCase().includes(normalizedQuery))
    );
  });

  const refreshClients = () => {
    startClientTransition(async () => {
      try {
        const response = await fetch("/api/clients", {
          method: "GET",
          cache: "no-store",
        });
        const raw = (await response.json()) as unknown;

        if (!response.ok) {
          const message =
            typeof raw === "object" && raw && "error" in raw && typeof raw.error === "string"
              ? raw.error
              : "No se pudieron leer los clientes.";

          throw new Error(message);
        }

        const data = clientListResponseSchema.parse(raw);
        setClients(data.clients);
        setStorageMode(data.storage);

        setSelectedClientId((current) => {
          if (current && data.clients.some((client) => client.id === current)) {
            return current;
          }

          return data.clients[0]?.id ?? null;
        });
      } catch (caughtError) {
        setClients([]);
        setSelectedClientId(null);
        setHistoryError(
          caughtError instanceof Error ? caughtError.message : "No se pudieron leer los clientes.",
        );
      }
    });
  };

  const refreshHistory = () => {
    startHistoryTransition(async () => {
      try {
        setHistoryError(null);

        if (!selectedClientId) {
          setHistory([]);
          return;
        }

        const response = await fetch(`/api/training/sessions?clientId=${selectedClientId}`, {
          method: "GET",
          cache: "no-store",
        });
        const raw = (await response.json()) as unknown;

        if (!response.ok) {
          const message =
            typeof raw === "object" && raw && "error" in raw && typeof raw.error === "string"
              ? raw.error
              : "No se pudo leer el historial.";

          throw new Error(message);
        }

        const data = trainingHistoryResponseSchema.parse(raw);
        setHistory(data.sessions);
        setStorageMode(data.storage);
      } catch (caughtError) {
        setHistory([]);
        setStorageMode("noop");
        setHistoryError(
          caughtError instanceof Error ? caughtError.message : "No se pudo leer el historial.",
        );
      }
    });
  };

  useEffect(() => {
    setDashboardSurface(initialSurface);
  }, [initialSurface]);

  useEffect(() => {
    const storedClientId = window.localStorage.getItem("musculator:selected-client-id");

    if (storedClientId) {
      setSelectedClientId(storedClientId);
    }

    if (!bootstrap) {
      refreshClients();
    }
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      window.localStorage.setItem("musculator:selected-client-id", selectedClientId);
    } else {
      window.localStorage.removeItem("musculator:selected-client-id");
    }
  }, [selectedClientId]);

  useEffect(() => {
    if (
      bootstrap &&
      !skippedBootstrapHistory.current &&
      selectedClientId === bootstrap.selectedClientId
    ) {
      skippedBootstrapHistory.current = true;
      return;
    }

    refreshHistory();
  }, [selectedClientId]);

  useEffect(() => {
    if (mode !== "live") {
      return;
    }

    const interval = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [mode]);

  useEffect(() => {
    if (restSeconds <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setRestSeconds((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [restSeconds]);

  const updateSession = (recipe: (current: TrainingSessionDraft) => TrainingSessionDraft) => {
    setSession((current) => recipe(current));
  };

  const updateEntry = (
    entryIndex: number,
    recipe: (
      current: TrainingSessionDraft["entries"][number],
    ) => TrainingSessionDraft["entries"][number],
  ) => {
    updateSession((current) => ({
      ...current,
      entries: current.entries.map((entry, currentIndex) =>
        currentIndex === entryIndex ? recipe(entry) : entry,
      ),
    }));
  };

  const applyTemplate = (templateId: string) => {
    startTemplateTransition(() => {
      setSession(createTrainingTemplateSession(templateId));
      setCompletedSets({});
      setCollapsedEntries({});
    });
  };

  const addExercise = (slug: string) => {
    startTransition(() => {
      updateSession((current) => ({
        ...current,
        entries: [...current.entries, createEntryFromCatalog(slug)],
      }));
      setShowCatalog(false);
      setCatalogQuery("");
    });
  };

  const saveSession = () => {
    startSavingTransition(async () => {
      try {
        setSaveMessage(null);
        setHistoryError(null);

        if (!selectedClientId) {
          throw new Error("Primero crea o selecciona un cliente.");
        }

        const response = await fetch("/api/training/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-client-id": selectedClientId,
          },
          body: JSON.stringify(session),
        });
        const raw = (await response.json()) as unknown;

        if (!response.ok) {
          const message =
            typeof raw === "object" && raw && "error" in raw && typeof raw.error === "string"
              ? raw.error
              : "No se pudo guardar la sesion.";

          throw new Error(message);
        }

        const data = trainingSessionSaveResponseSchema.parse(raw);

        setSaveMessage(
          data.storage === "supabase"
            ? `Sesion guardada${data.sessionId ? ` · ${data.sessionId.slice(0, 8)}` : ""}`
            : "Persistencia en preview: faltan variables server-side de Supabase.",
        );

        refreshHistory();
      } catch (caughtError) {
        setSaveMessage(null);
        setHistoryError(
          caughtError instanceof Error ? caughtError.message : "No se pudo guardar la sesion.",
        );
      }
    });
  };

  const updateSetMetric = (
    entryIndex: number,
    setIndex: number,
    field: "reps" | "weightKg" | "rpe",
    delta: number,
  ) => {
    updateEntry(entryIndex, (current) => ({
      ...current,
      sets: current.sets.map((currentSet, currentSetIndex) => {
        if (currentSetIndex !== setIndex) {
          return currentSet;
        }

        if (field === "reps") {
          return {
            ...currentSet,
            reps: adjustMetric(currentSet.reps, delta, { min: 1, max: 30 }),
          };
        }

        if (field === "weightKg") {
          return {
            ...currentSet,
            weightKg: adjustMetric(currentSet.weightKg, delta, {
              min: 0,
              max: 400,
              precision: 1,
            }),
          };
        }

        return {
          ...currentSet,
          rpe: adjustMetric(currentSet.rpe, delta, { min: 1, max: 10 }),
        };
      }),
    }));
  };

  const toggleSetCompleted = (entryIndex: number, setIndex: number) => {
    const key = getSetKey(entryIndex, setIndex);

    setCompletedSets((current) => {
      const next = !current[key];

      if (next) {
        setRestSeconds(90);
      }

      return {
        ...current,
        [key]: next,
      };
    });
  };

  const removeSet = (entryIndex: number, setIndex: number) => {
    updateEntry(entryIndex, (current) => ({
      ...current,
      sets:
        current.sets.length > 1
          ? current.sets.filter((_, currentSetIndex) => currentSetIndex !== setIndex)
          : current.sets,
    }));
  };

  const toggleEntryCollapse = (entryIndex: number, slug: string) => {
    const key = entrySignature(entryIndex, slug);

    setCollapsedEntries((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const openLiveMode = () => {
    if (!selectedClientId) {
      setHistoryError("Primero crea o selecciona un cliente.");
      return;
    }

    setShowCheckIn(true);
  };

  const createClientProfile = () => {
    startClientTransition(async () => {
      try {
        setHistoryError(null);

        const response = await fetch("/api/clients", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: clientForm.fullName,
            goal: clientForm.goal || undefined,
            notes: clientForm.notes || undefined,
          }),
        });
        const raw = (await response.json()) as unknown;

        if (!response.ok) {
          const message =
            typeof raw === "object" && raw && "error" in raw && typeof raw.error === "string"
              ? raw.error
              : "No se pudo crear el cliente.";

          throw new Error(message);
        }

        const data = clientCreateResponseSchema.parse(raw);

        if (data.client) {
          setClients((current) => [data.client!, ...current]);
          setSelectedClientId(data.client.id);
          setClientForm({
            fullName: "",
            goal: "",
            notes: "",
          });
        }
      } catch (caughtError) {
        setHistoryError(
          caughtError instanceof Error ? caughtError.message : "No se pudo crear el cliente.",
        );
      }
    });
  };

  const confirmLiveMode = () => {
    setShowCheckIn(false);
    setRestSeconds(0);

    const liveSessionId = `${selectedClientId ?? "preview"}-${Date.now().toString(36)}`;

    router.push(`/session/${encodeURIComponent(liveSessionId)}`);

    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  const closeLiveMode = () => {
    setMode("dashboard");

    if (document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => undefined);
    }
  };

  const plannedExercises = session.entries.map((entry, entryIndex) => ({
    ...entry,
    entryIndex,
    totalSets: entry.sets.length,
    totalLoadKg: entry.sets.reduce(
      (sum, set) => sum + (set.reps ?? 0) * (set.weightKg ?? 0),
      0,
    ),
  }));

  return (
    <div className="min-h-[100svh] text-white">
      {showCheckIn ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 backdrop-blur sm:items-center">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#0c1420] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <p className="text-sm uppercase tracking-[0.24em] text-white/45">Check-in</p>
            <h2 className="mt-3 text-3xl font-semibold">Ajusta el estado del bloque antes de entrar al modo live.</h2>
            <p className="mt-3 text-sm leading-7 text-white/60">
              Esto sale de la pantalla principal de entrenamiento para que adentro del gym no pelees con inputs ni ruido visual.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm text-white/65">
                Sueno
                <input
                  type="number"
                  min="0"
                  max="12"
                  step="0.1"
                  value={session.recoveryInputs.sleepHours}
                  onChange={(event) =>
                    updateSession((current) => ({
                      ...current,
                      recoveryInputs: {
                        ...current.recoveryInputs,
                        sleepHours: Number(event.target.value),
                      },
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none transition focus:border-[#4cb894]"
                />
              </label>
              <label className="grid gap-2 text-sm text-white/65">
                Carbos target
                <input
                  type="number"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={session.recoveryInputs.carbsTargetRatio}
                  onChange={(event) =>
                    updateSession((current) => ({
                      ...current,
                      recoveryInputs: {
                        ...current.recoveryInputs,
                        carbsTargetRatio: Number(event.target.value),
                      },
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none transition focus:border-[#4cb894]"
                />
              </label>
              <label className="grid gap-2 text-sm text-white/65">
                Hidratacion target
                <input
                  type="number"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={session.recoveryInputs.hydrationTargetRatio}
                  onChange={(event) =>
                    updateSession((current) => ({
                      ...current,
                      recoveryInputs: {
                        ...current.recoveryInputs,
                        hydrationTargetRatio: Number(event.target.value),
                      },
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none transition focus:border-[#4cb894]"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCheckIn(false)}
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmLiveMode}
                className="inline-flex items-center justify-center rounded-full bg-[#4cb894] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#64c9a7]"
              >
                Iniciar sesion live
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCatalog ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-0 backdrop-blur sm:p-4">
          <div className="w-full max-w-3xl rounded-t-[2rem] border border-white/10 bg-[#0a1019] p-5 shadow-[0_-20px_80px_rgba(0,0,0,0.45)] sm:rounded-[2rem]">
            <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-white/18 sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-white/45">Catalogo</p>
                <h2 className="mt-2 text-2xl font-semibold">Agrega ejercicios sin salir del flujo.</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalog(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white transition hover:bg-white/10"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <input
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
                placeholder="Buscar ejercicio o musculo"
                className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/35 focus:border-[#4cb894]"
              />

              <div className="flex flex-wrap gap-2">
                {catalogCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      category === activeCategory
                        ? "bg-[#4cb894] text-slate-950"
                        : "border border-white/10 bg-white/6 text-white/75 hover:bg-white/10"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="grid max-h-[52vh] gap-3 overflow-y-auto pr-1">
                {filteredCatalog.map((exercise) => (
                  <button
                    key={exercise.slug}
                    type="button"
                    onClick={() => addExercise(exercise.slug)}
                    className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4 text-left transition hover:border-[#4cb894]/40 hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{exercise.name}</p>
                        <p className="mt-1 text-sm text-white/55">
                          {exercise.category} · {stimulusLabel[exercise.stimulusVector]} · {exercise.equipment}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/55">
                        {exercise.recoveryTimeHours}h
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "dashboard" ? (
        <div className="flex min-h-[100svh] flex-col">
          <section className="hidden rounded-[2rem] border border-white/8 bg-[#08111a] p-3 shadow-[0_24px_80px_rgba(2,6,23,0.24)] md:block">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => selectDashboardSurface("profile")}
                className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${
                  dashboardSurface === "profile"
                    ? "bg-[#4cb894] text-slate-950"
                    : "border border-white/10 bg-white/6 text-white hover:bg-white/10"
                }`}
              >
                Perfil del cliente
              </button>
              <button
                type="button"
                onClick={() => selectDashboardSurface("lab")}
                className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${
                  dashboardSurface === "lab"
                    ? "bg-[#4cb894] text-slate-950"
                    : "border border-white/10 bg-white/6 text-white hover:bg-white/10"
                }`}
              >
                Lab
              </button>
              <button
                type="button"
                onClick={() => selectDashboardSurface("nutrition")}
                className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${
                  dashboardSurface === "nutrition"
                    ? "bg-[#4cb894] text-slate-950"
                    : "border border-white/10 bg-white/6 text-white hover:bg-white/10"
                }`}
              >
                Nutricion
              </button>
              <button
                type="button"
                onClick={() => selectDashboardSurface("clients")}
                className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${
                  dashboardSurface === "clients"
                    ? "bg-[#4cb894] text-slate-950"
                    : "border border-white/10 bg-white/6 text-white hover:bg-white/10"
                }`}
              >
                Clientes
              </button>
              <button
                type="button"
                onClick={openLiveMode}
                className="ml-auto inline-flex min-h-11 items-center justify-center rounded-full bg-[#4cb894] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#63c7a5]"
              >
                Live
              </button>
            </div>
          </section>

          <section className="border-b border-white/8 bg-[#08111a] px-4 py-4 md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">Musculator app</p>
                <h1 className="mt-1 truncate text-xl font-semibold text-white">
                  {dashboardSurface === "profile"
                    ? "Perfil"
                    : dashboardSurface === "lab"
                      ? "Lab"
                      : dashboardSurface === "nutrition"
                        ? "Nutricion"
                        : "Clientes"}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => selectDashboardSurface("clients")}
                className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition ${
                  dashboardSurface === "clients"
                    ? "bg-[#4cb894] text-slate-950"
                    : "border border-white/10 bg-white/6 text-white hover:bg-white/10"
                }`}
              >
                Clientes
              </button>
            </div>
          </section>

          <div className="flex-1 px-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-0 sm:pb-0 sm:pt-6">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={dashboardSurface}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="grid min-w-0 gap-6"
            >

          {dashboardSurface === "profile" ? (
            <>
              <section className="min-w-0">
                <article className="relative overflow-visible rounded-[2.2rem] border border-white/8 bg-[#09111b] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.35)] sm:rounded-[2.6rem] sm:p-6 md:overflow-hidden md:p-8">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(76,184,148,0.18),transparent_0_28%),radial-gradient(circle_at_80%_18%,rgba(56,189,248,0.14),transparent_0_28%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.1),transparent_0_36%)]" />
                  <div className="relative grid min-w-0 gap-5 sm:gap-6">
                    <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                      <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55">
                        Athlete OS
                      </span>
                      <span className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] ${connectionTone[storageMode]}`}>
                        {persistenceEnabled ? "storage live" : "preview"}
                      </span>
                      <span className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] ${readinessTone[analysis.readiness.status]}`}>
                        {readinessPalette[analysis.readiness.status].label}
                      </span>
                    </div>

                    <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-[auto_1fr] lg:items-end">
                      <div className="flex flex-col items-center gap-4">
                        <div
                          className="flex h-24 w-24 items-center justify-center rounded-full border-4 bg-[#0d1724] text-3xl font-semibold text-white shadow-[0_0_35px_rgba(0,0,0,0.24)] sm:h-30 sm:w-30 sm:text-4xl sm:shadow-[0_0_50px_rgba(0,0,0,0.28)]"
                          style={{
                            borderColor: readinessPalette[analysis.readiness.status].solid,
                            boxShadow: `0 0 0 7px ${readinessPalette[analysis.readiness.status].soft}`,
                          }}
                        >
                          {selectedClient?.fullName.slice(0, 2).toUpperCase() ?? "MU"}
                        </div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">telemetria en vivo</p>
                      </div>

                      <div className="grid min-w-0 gap-4 sm:gap-5">
                        <div>
                          <p className="text-sm uppercase tracking-[0.24em] text-white/42">Perfil y telemetria</p>
                          <h1 className="mt-3 break-words text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-5xl">{athleteTitle}</h1>
                          <p className="mt-3 max-w-3xl text-base leading-7 text-white/62">
                            {selectedClient
                              ? selectedClient.goal ?? "Todavia no hay un objetivo principal definido para este atleta."
                              : "El cockpit junta readiness, balance de vectores, calor anatómico, recuperación y nutrición en una sola vista operativa."}
                          </p>
                        </div>

                        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-[1.45rem] border border-white/10 bg-white/6 px-4 py-4">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">Edad</p>
                            <p className="mt-2 text-xl font-semibold text-white">{age} años</p>
                          </div>
                          <div className="rounded-[1.45rem] border border-white/10 bg-white/6 px-4 py-4">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">Altura</p>
                            <p className="mt-2 text-xl font-semibold text-white">{heightMeters.toFixed(2)} m</p>
                          </div>
                          <div className="rounded-[1.45rem] border border-white/10 bg-white/6 px-4 py-4">
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">Peso</p>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${recentActiveDays >= 3 ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"}`}>
                                {weeklyTrend}
                              </span>
                            </div>
                            <p className="mt-2 text-xl font-semibold text-white">{weightKg.toFixed(1)} kg</p>
                          </div>
                          <div className="rounded-[1.45rem] border border-white/10 bg-white/6 px-4 py-4">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">Fase</p>
                            <p className="mt-2 text-xl font-semibold text-white">{mesocycleLabel}</p>
                            <p className="mt-1 text-xs text-white/50">Semana {mesocycleWeek}/6</p>
                          </div>
                        </div>

                        <p className="text-sm leading-6 text-white/45">
                          Biometría base inferida desde notas del cliente mientras no exista ficha persistida dedicada.
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              </section>

              <section className="rounded-[2.35rem] border border-white/8 bg-[#08111a] p-3 shadow-[0_24px_80px_rgba(2,6,23,0.3)] md:p-4">
                <div className="grid gap-3 lg:grid-cols-[0.9fr_1.05fr_0.92fr]">
                  <article onClick={openReadinessSheet} className={`cursor-pointer rounded-[1.9rem] border p-5 transition hover:-translate-y-0.5 hover:border-[#4cb894]/30 ${analysis.readiness.status === "red" ? "border-rose-400/35 bg-[linear-gradient(180deg,rgba(127,29,29,0.9),rgba(76,5,25,0.92))]" : "border-white/8 bg-[#0d1724]"}`}>
                    <p className="text-sm uppercase tracking-[0.24em] text-white/45">Readiness SNC</p>
                    <div className="mt-4 flex justify-center">
                      <div
                        className="relative flex h-36 w-36 items-center justify-center rounded-full md:h-40 md:w-40"
                        style={{
                          background: `conic-gradient(${readinessPalette[analysis.readiness.status].solid} ${analysis.readiness.score}%, rgba(96,165,250,0.14) 0)`,
                          boxShadow: `inset 0 0 0 10px rgba(255,255,255,0.03), 0 0 0 12px ${readinessPalette[analysis.readiness.status].soft}`,
                        }}
                      >
                        <div className="absolute inset-[12px] rounded-full bg-[#0b1622]" />
                        <div className="absolute inset-[18px] rounded-full border border-white/8 md:inset-[20px]" />
                        <div className="relative z-10 text-center text-white">
                          <p className="text-5xl font-semibold leading-none md:text-6xl">{analysis.readiness.score}</p>
                          <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-white/55 md:mt-3 md:text-[12px] md:tracking-[0.34em]">Readiness</p>
                        </div>
                      </div>
                    </div>
                      <div className="mt-5 text-center text-white">
                        <p className="text-xl font-semibold md:text-2xl">{readinessPalette[analysis.readiness.status].label}</p>
                        <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-7 text-white/72 md:text-base md:leading-8">
                        Penalidad central {formatRounded(analysis.readiness.centralPenalty)}. Si ayer hubo mucho tonelaje o compuestos pesados, hoy conviene regular agresividad.
                      </p>
                    </div>
                    {analysis.readiness.status === "red" ? (
                      <div className="mt-5 rounded-[1.5rem] border-2 border-rose-300/60 bg-rose-950/40 p-4 text-rose-100">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]">Alerta crítica</p>
                        <p className="mt-2 text-lg font-semibold">Fatiga Alta Detectada - Priorizar Recuperación</p>
                        <p className="mt-2 text-sm leading-6 text-rose-100/80">La carga neural y local se superpusieron. Hoy conviene bajar agresividad, bajar sets al fallo y mover el bloque hacia recuperación.</p>
                      </div>
                    ) : null}
                  </article>

                  <article onClick={openMetabolicSheet} className="cursor-pointer rounded-[1.9rem] border border-white/8 bg-[#0d1724] p-5 transition hover:-translate-y-0.5 hover:border-[#4cb894]/30">
                    <p className="text-sm uppercase tracking-[0.24em] text-white/45">Estado metabolico</p>
                    <div className="mt-5 flex items-end justify-between gap-3 text-white">
                      <p className="text-4xl font-semibold leading-none md:text-5xl">{projectedIntakeKcal}</p>
                      <p className="pb-1 text-sm text-white/58">objetivo {targetIntakeKcal} kcal</p>
                    </div>
                    <p className="mt-4 max-w-[22rem] text-sm leading-7 text-white/72 md:text-base md:leading-8">
                      Ingesta proyectada hoy combinando carga del draft, ratio de carbos e hidratacion objetivo.
                    </p>
                    <div className="mt-5 h-3 rounded-full bg-black/30">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-[#4cb894] via-[#6fd8b6] to-[#9cf3d3]"
                        style={{ width: `${Math.max(intakeProgress, 10)}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/45">{intakeProgress}% cubierto</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Carbos ratio</p>
                        <p className="mt-3 text-3xl font-semibold text-white md:text-4xl">{session.recoveryInputs.carbsTargetRatio.toFixed(2)}</p>
                      </div>
                      <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Hidratacion ratio</p>
                        <p className="mt-3 text-3xl font-semibold text-white md:text-4xl">{session.recoveryInputs.hydrationTargetRatio.toFixed(2)}</p>
                      </div>
                    </div>
                  </article>

                  <article onClick={openNextActionSheet} className="cursor-pointer rounded-[1.9rem] border border-white/8 bg-[#09111b] p-5 transition hover:-translate-y-0.5 hover:border-[#4cb894]/30">
                    <p className="text-sm uppercase tracking-[0.24em] text-white/45">Siguiente accion sugerida</p>
                    <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-base leading-8 text-white/82 md:text-lg md:leading-9">{nextActionSuggestion}</p>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Bloque actual</p>
                        <p className="mt-3 text-xl font-semibold text-white md:text-2xl">{session.title}</p>
                      </div>
                      <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Ultimos titulos</p>
                        <p className="mt-3 text-base font-medium leading-7 text-white md:text-lg md:leading-8">{recentTitles[0] ?? "Sin historial"}</p>
                      </div>
                    </div>
                  </article>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
                <div className="grid gap-6">
                  <article onClick={openAnatomySheet} className="cursor-pointer rounded-[2.35rem] border border-white/8 bg-[#0d1724] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)] transition hover:-translate-y-0.5 hover:border-[#4cb894]/30">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-white/45">Mapa de calor anatómico</p>
                        <h2 className="mt-2 text-3xl font-semibold text-white">Frente y espalda del atleta</h2>
                        <p className="mt-2 text-sm leading-7 text-white/58">Rojo cuando un grupo está pasado de carga, amarillo cuando sigue vivo y gris cuando ya recuperó.</p>
                      </div>
                      <div className="rounded-[1.3rem] border border-white/10 bg-white/6 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Carga semanal</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{Math.round(weeklyTotalLoad)} kg</p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <AnatomyHeatmap muscles={analysis.muscleLoad} />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-white/45">
                      <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-[4px] bg-rose-400" /> high overload</span>
                      <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-[4px] bg-amber-400" /> moderate</span>
                      <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-[4px] bg-slate-500" /> recovered</span>
                    </div>
                  </article>

                  <article onClick={openRadarSheet} className="cursor-pointer rounded-[2.35rem] border border-white/8 bg-[#0d1724] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)] transition hover:-translate-y-0.5 hover:border-[#4cb894]/30">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-white/45">Radar biomecánico</p>
                        <h2 className="mt-2 text-3xl font-semibold text-white">Huella deportiva del último mes</h2>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Eje más flojo</p>
                        <p className="mt-2 text-sm font-semibold text-white">{weakestBiomechanicalAxis?.label ?? "Sin data"}</p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <BiomechanicalRadar axes={biomechanicalAxes} />
                    </div>
                  </article>

                  <article onClick={openConsistencySheet} className="cursor-pointer rounded-[2.35rem] border border-white/8 bg-[#09111b] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.35)] transition hover:-translate-y-0.5 hover:border-[#4cb894]/30">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-white/45">Mapa de calor de consistencia</p>
                        <h2 className="mt-2 text-3xl font-semibold text-white">El GitHub del cuerpo</h2>
                      </div>
                      <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Días activos últimos 7</p>
                        <p className="mt-2 text-3xl font-semibold text-white">{recentActiveDays}</p>
                      </div>
                    </div>

                    <div className="mt-6 overflow-x-auto pb-2">
                      <div className="inline-grid min-w-[720px] grid-flow-col grid-rows-7 gap-2">
                        {heatmapDays.map((day) => {
                          const tone = getHeatmapCellTone(day.mode, day.intensity);

                          return (
                            <button
                              key={day.dateKey}
                              type="button"
                              onClick={() => setSelectedHeatmapDay(day.dateKey)}
                              className={`h-5 w-5 rounded-[6px] border transition hover:scale-110 ${tone}`}
                              aria-label={`${day.dateKey}: ${day.sessions.length} sesiones`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-white/45">
                      <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-[4px] border border-emerald-400/20 bg-emerald-500/70" /> musculación</span>
                      <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-[4px] border border-orange-400/20 bg-orange-500/70" /> acondicionamiento</span>
                      <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-[4px] border border-sky-400/20 bg-sky-500/70" /> mixto</span>
                      <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-[4px] border border-white/10 bg-white/8" /> descanso</span>
                    </div>
                  </article>
                </div>

                <div className="grid gap-6">
                  <article className="rounded-[2.35rem] border border-white/8 bg-[#09111b] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.35)]">
                    <p className="text-sm uppercase tracking-[0.24em] text-white/45">Grupos musculares y recuperación</p>
                    <div className="mt-5 grid gap-3">
                      {recoveryCatalog.map((muscle) => (
                        <div key={muscle.muscle} className={`rounded-[1.35rem] border p-4 ${muscleTone[muscle.tone]}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">{muscle.label}</p>
                              <p className="text-sm opacity-75">{muscle.category}</p>
                            </div>
                            <span className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]">
                              {muscle.recoveryTimeHours}h
                            </span>
                          </div>
                          <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
                            <div className="flex items-center justify-between gap-3">
                              <span>Sets</span>
                              <span className="font-medium">{muscle.totalSets}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>RPE medio</span>
                              <span className="font-medium">{muscle.averageRpe}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>Load</span>
                              <span className="font-medium">{Math.round(muscle.totalLoadKg)} kg</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-[2.35rem] border border-white/8 bg-[#09111b] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.35)]">
                    <p className="text-sm uppercase tracking-[0.24em] text-white/45">Insights</p>
                    <div className="mt-4 grid gap-3 text-sm leading-7 text-white/76">
                      {analysis.recommendations.map((recommendation) => (
                        <div key={recommendation} className="rounded-[1.3rem] border border-white/10 bg-white/6 px-4 py-3">
                          {recommendation}
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Bloque actual</p>
                        <p className="mt-2 text-lg font-semibold text-white">{session.title}</p>
                      </div>
                      <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Últimos títulos</p>
                        <p className="mt-2 text-sm leading-6 text-white/65">{recentTitles.length > 0 ? recentTitles.join(" · ") : "Sin historial todavía."}</p>
                      </div>
                    </div>
                    <div className="mt-5 rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Músculos foco</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {focusMuscles.length > 0 ? (
                          focusMuscles.map(([muscleSlug, muscle]) => (
                            <span key={muscleSlug} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/62">
                              {muscle.muscleName} · {muscle.totalSets} sets
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-white/52">Todavía no hay carga histórica consolidada.</span>
                        )}
                      </div>
                    </div>
                  </article>

                  <article className="rounded-[2.35rem] border border-white/8 bg-[#0d1724] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
                    <p className="text-sm uppercase tracking-[0.24em] text-white/45">Balance de vectores</p>
                    <div className="mt-4 grid gap-3">
                      {analysis.stimulusBalance.map((slice) => (
                        <div key={slice.stimulusVector} className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-white">{stimulusLabel[slice.stimulusVector]}</p>
                            <span className="text-sm text-white/55">{slice.totalSets} sets</span>
                          </div>
                          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/8">
                            <div
                              className="h-full rounded-full bg-[#4cb894]"
                              style={{
                                width: `${Math.max((slice.totalSets / Math.max(analysis.summary.totalSets, 1)) * 100, 8)}%`,
                              }}
                            />
                          </div>
                          <p className="mt-2 text-sm text-white/52">{Math.round(slice.totalLoadKg)} kg de volumen acumulado.</p>
                        </div>
                      ))}
                    </div>
                  </article>

                </div>
              </section>

              {activeHeatmapDay ? (
                <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-0 backdrop-blur sm:items-center sm:p-4">
                  <div className="w-full max-w-2xl rounded-t-[2rem] border border-white/10 bg-[#0a1019] p-5 shadow-[0_-20px_80px_rgba(0,0,0,0.45)] sm:rounded-[2rem]">
                    <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-white/18 sm:hidden" />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-white/45">Resumen diario</p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">
                          {activeHeatmapDay.date.toLocaleDateString("es-AR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedHeatmapDay(null)}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white transition hover:bg-white/10"
                      >
                        ×
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {activeHeatmapDay.sessions.length > 0 ? (
                        activeHeatmapDay.sessions.map((sessionSummary) => (
                          <div key={sessionSummary.sessionId} className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-white">{sessionSummary.title}</p>
                                <p className="mt-1 text-sm text-white/52">
                                  {sessionSummary.totalSets} sets · {Math.round(sessionSummary.totalLoadKg)} kg · RPE medio {sessionSummary.averageRpe}
                                </p>
                              </div>
                              <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${isConditioningSession(sessionSummary.title) ? "border-orange-400/25 bg-orange-500/10 text-orange-200" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"}`}>
                                {isConditioningSession(sessionSummary.title) ? "condicion" : "fuerza"}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {sessionSummary.topMuscles.map((muscle) => (
                                <span
                                  key={`${sessionSummary.sessionId}-${muscle.muscleSlug}`}
                                  className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/58"
                                >
                                  {muscle.muscleName} · {muscle.totalSets} sets
                                </span>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4 text-sm text-white/55">
                          Ese día no hay actividad guardada para este cliente.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : dashboardSurface === "lab" ? (
            <section className="grid gap-4">
              <article className="rounded-[2.2rem] border border-white/8 bg-[#09111b] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.35)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-white/45">Lab integrado</p>
                    <h2 className="mt-2 text-3xl font-semibold text-white">Catalogo interno sin cambio de ruta</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-white/62">
                      Esta vista comparte datos y logica con /lab/exercises, pero corre dentro del workspace principal para mantener flujo app-like en /.
                    </p>
                  </div>
                </div>
              </article>

              <EmbeddedExerciseCatalog />
            </section>
          ) : dashboardSurface === "nutrition" ? (
            <>
              <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                <article className="relative overflow-hidden rounded-[2.4rem] border border-white/8 bg-[#09111b] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.35)] md:p-8">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(76,184,148,0.18),transparent_0_28%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.14),transparent_0_28%),radial-gradient(circle_at_60%_100%,rgba(245,158,11,0.12),transparent_0_34%)]" />
                  <div className="relative grid gap-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/55">
                        Fuel system
                      </span>
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-emerald-200">
                        {intakeProgress}% cubierto
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-end">
                      <div className="rounded-[2rem] border border-white/10 bg-black/20 px-6 py-5">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">Ingesta proyectada</p>
                        <p className="mt-3 text-5xl font-semibold text-white">{projectedIntakeKcal}</p>
                        <p className="mt-2 text-sm text-white/55">objetivo {targetIntakeKcal} kcal</p>
                      </div>
                      <div>
                        <h2 className="text-3xl font-semibold text-white md:text-4xl">Nutricion integrada al bloque</h2>
                        <p className="mt-3 max-w-2xl text-base leading-7 text-white/62">
                          Esta superficie concentra recuperacion, carga metabolica y registro rapido sin mezclarlo con el builder del entrenamiento.
                        </p>
                      </div>
                    </div>

                    <div className="h-3 rounded-full bg-black/30">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-[#4cb894] via-[#6fd8b6] to-[#9cf3d3]"
                        style={{ width: `${Math.max(intakeProgress, 8)}%` }}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Carbos ratio</p>
                        <p className="mt-3 text-3xl font-semibold text-white">{session.recoveryInputs.carbsTargetRatio.toFixed(2)}</p>
                      </div>
                      <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Hidratacion ratio</p>
                        <p className="mt-3 text-3xl font-semibold text-white">{session.recoveryInputs.hydrationTargetRatio.toFixed(2)}</p>
                      </div>
                      <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Readiness</p>
                        <p className="mt-3 text-3xl font-semibold text-white">{readinessScoreDisplay}</p>
                      </div>
                    </div>
                  </div>
                </article>

                <article className="rounded-[2.4rem] border border-white/8 bg-[#0d1724] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)] md:p-8">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/45">Prioridades de recuperacion</p>
                  <div className="mt-5 grid gap-3 text-sm leading-7 text-white/72">
                    {analysis.recommendations.map((recommendation) => (
                      <div key={recommendation} className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3">
                        {recommendation}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {recoveryCatalog.slice(0, 4).map((muscle) => (
                      <div key={muscle.muscle} className={`rounded-[1.35rem] border p-4 ${muscleTone[muscle.tone]}`}>
                        <p className="font-semibold">{muscle.label}</p>
                        <p className="mt-1 text-sm opacity-75">{muscle.category}</p>
                        <p className="mt-4 text-sm">Recovery {muscle.recoveryTimeHours}h</p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <TrainingIntakeForm defaultPayload={intakePayload} persistenceEnabled={persistenceEnabled} />
            </>
          ) : dashboardSurface === "clients" ? (
            <>
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[2.2rem] border border-white/8 bg-[#0d1724] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
              <p className="text-sm uppercase tracking-[0.24em] text-white/45">Cliente activo</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {selectedClient ? selectedClient.fullName : "Todavia no hay cliente seleccionado"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/58">
                Toda la informacion de entrenamiento, historial y futuros datos de ejercicios queda separada por persona desde este selector.
              </p>

              <div className="mt-5 grid gap-3">
                {clients.length > 0 ? (
                  clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => setSelectedClientId(client.id)}
                      className={`rounded-[1.35rem] border p-4 text-left transition ${
                        selectedClientId === client.id
                          ? "border-[#4cb894]/50 bg-[#4cb894]/10"
                          : "border-white/10 bg-white/6 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{client.fullName}</p>
                          <p className="text-sm text-white/48">
                            {client.goal ?? "Sin objetivo cargado"}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/45">
                          {formatShortDate(client.createdAt)}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4 text-sm text-white/55">
                    Primero crea una persona para empezar a guardar sesiones separadas.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[2.2rem] border border-white/8 bg-[#09111b] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.35)]">
              <p className="text-sm uppercase tracking-[0.24em] text-white/45">Alta de cliente</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Crea la persona antes de cargar su informacion.</h2>
              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm text-white/62">
                  Nombre completo
                  <input
                    value={clientForm.fullName}
                    onChange={(event) =>
                      setClientForm((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none transition focus:border-[#4cb894]"
                  />
                </label>
                <label className="grid gap-2 text-sm text-white/62">
                  Objetivo
                  <input
                    value={clientForm.goal}
                    onChange={(event) =>
                      setClientForm((current) => ({
                        ...current,
                        goal: event.target.value,
                      }))
                    }
                    placeholder="Hipertrofia, recomposicion, fuerza"
                    className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#4cb894]"
                  />
                </label>
                <label className="grid gap-2 text-sm text-white/62">
                  Notas base
                  <textarea
                    rows={3}
                    value={clientForm.notes}
                    onChange={(event) =>
                      setClientForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    className="rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none transition focus:border-[#4cb894]"
                  />
                </label>
                <button
                  type="button"
                  onClick={createClientProfile}
                  disabled={isCreatingClient || clientForm.fullName.trim().length < 2}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#4cb894] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#63c7a5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingClient ? "Creando cliente..." : "Crear cliente"}
                </button>
              </div>
            </article>
          </section>

          {(saveMessage || historyError) && (
            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-4 text-sm text-white/65">
              {saveMessage ?? historyError}
            </div>
          )}
            </>
          ) : (
            <>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="relative overflow-hidden rounded-[2.2rem] border border-white/8 bg-[#09111b] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.35)] md:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.15),transparent_0_30%),radial-gradient(circle_at_82%_18%,rgba(76,184,148,0.16),transparent_0_28%),radial-gradient(circle_at_55%_100%,rgba(234,88,12,0.12),transparent_0_35%)]" />
              <div className="relative grid gap-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white/55">
                    Dashboard
                  </span>
                  <span
                    className={`rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] ${connectionTone[storageMode]}`}
                  >
                    {persistenceEnabled ? "supabase live" : "preview"}
                  </span>
                  <span
                    className={`rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] ${readinessTone[analysis.readiness.status]}`}
                  >
                    readiness {analysis.readiness.status}
                  </span>
                  {selectedClient ? (
                    <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/65">
                      cliente {selectedClient.fullName}
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white lg:text-5xl">
                      Centro de mando separado del modo guerra para entrenar sin friccion.
                    </h1>
                    <p className="mt-4 max-w-3xl text-base leading-7 text-white/62">
                      Aca analizas carga, planeas el bloque y revisas el historial real. Cuando arrancas la sesion, la interfaz cambia a un modo live orientado a pulgar, descanso y registro rapido.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={openLiveMode}
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#4cb894] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#63c7a5]"
                    >
                      Iniciar sesion
                    </button>
                    <button
                      type="button"
                      onClick={saveSession}
                      disabled={isSaving}
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? "Guardando..." : "Guardar plan actual"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Score</p>
                    <p className="mt-3 text-5xl font-semibold">{analysis.readiness.score}</p>
                    <p className="mt-2 text-sm text-white/55">Estado estimado del bloque.</p>
                  </div>
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Total sets</p>
                    <p className="mt-3 text-5xl font-semibold">{analysis.summary.totalSets}</p>
                    <p className="mt-2 text-sm text-white/55">Distribuidos entre {session.entries.length} ejercicios.</p>
                  </div>
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Tonelaje</p>
                    <p className="mt-3 text-5xl font-semibold">{Math.round(analysis.summary.totalLoadKg)}</p>
                    <p className="mt-2 text-sm text-white/55">Carga total proyectada del draft.</p>
                  </div>
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Ultimo sync</p>
                    <p className="mt-3 text-2xl font-semibold">
                      {latestSession ? formatShortDate(latestSession.startedAt) : "Sin historial"}
                    </p>
                    <p className="mt-2 text-sm text-white/55">
                      {latestSession ? latestSession.title : "Todavia no hay guardados reales."}
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[2.2rem] border border-white/8 bg-[#0d1724] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
              <p className="text-sm uppercase tracking-[0.24em] text-white/45">Infraestructura</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Estado operativo</h2>
              <p className="mt-3 text-sm leading-7 text-white/60">
                La persistencia, el browser env y el runtime server-side quedan visibles aca. n8n no compite por espacio con el flujo de entrenamiento.
              </p>

              <div className="mt-5 grid gap-3">
                {integrations.map((item) => (
                  <div key={item.key} className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.label}</p>
                        <p className="text-sm text-white/48">{item.scope}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] ${
                          item.ready
                            ? "bg-emerald-500/15 text-emerald-200"
                            : "bg-amber-500/15 text-amber-200"
                        }`}
                      >
                        {item.ready ? "ok" : "pendiente"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">Resumen</p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {readyIntegrations}/{integrations.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  La capa critica ya esta lista para trabajar con sesiones reales y despues enchufar la API nueva de ejercicios sin romper este dashboard.
                </p>
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-[2.2rem] border border-white/8 bg-[#0d1724] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="grid gap-3 md:min-w-[22rem] md:flex-1">
                  <label className="grid gap-2 text-sm text-white/62">
                    Nombre de la sesion
                    <input
                      value={session.title}
                      onChange={(event) =>
                        updateSession((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none transition focus:border-[#4cb894]"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-white/62">
                    Notas del bloque
                    <textarea
                      value={session.notes ?? ""}
                      onChange={(event) =>
                        updateSession((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      rows={3}
                      className="rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none transition focus:border-[#4cb894]"
                    />
                  </label>
                </div>

                <div className="grid gap-2 md:w-[22rem]">
                  <p className="text-sm uppercase tracking-[0.2em] text-white/42">Templates</p>
                  <div className="flex flex-wrap gap-2">
                    {trainingTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => applyTemplate(template.id)}
                        disabled={isPending}
                        className="inline-flex items-center rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCatalog(true)}
                    className="mt-2 inline-flex min-h-12 items-center justify-center rounded-full border border-[#4cb894]/35 bg-[#4cb894]/10 px-4 py-3 text-sm font-medium text-[#8ff2ce] transition hover:bg-[#4cb894]/16"
                  >
                    + Agregar ejercicio
                  </button>
                </div>
              </div>

              {saveMessage ? (
                <p className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {saveMessage}
                </p>
              ) : null}

              {historyError ? (
                <p className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {historyError}
                </p>
              ) : null}

              <div className="mt-6 grid gap-3">
                {plannedExercises.map((entry) => (
                  <div
                    key={entrySignature(entry.entryIndex, entry.slug)}
                    className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-white">{entry.name}</p>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                            {entry.category}
                          </span>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                            {stimulusLabel[entry.stimulusVector]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-white/55">
                          {entry.totalSets} sets · {Math.round(entry.totalLoadKg)} kg · recovery {entry.recoveryTimeHours}h
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateSession((current) => ({
                            ...current,
                            entries: current.entries.filter(
                              (_, currentIndex) => currentIndex !== entry.entryIndex,
                            ),
                          }))
                        }
                        disabled={session.entries.length === 1}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 text-sm font-medium text-white/75 transition hover:bg-black/35 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <div className="grid gap-6">
              <article className="rounded-[2.2rem] border border-white/8 bg-[#0d1724] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
                <p className="text-sm uppercase tracking-[0.24em] text-white/45">Fatiga por musculo</p>
                <div className="mt-4 grid gap-3">
                  {analysis.muscleLoad.map((muscle) => (
                    <div
                      key={muscle.muscle}
                      className={`rounded-[1.3rem] border px-4 py-4 ${muscleTone[muscle.tone]}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{muscle.label}</p>
                          <p className="text-sm opacity-75">{muscle.category}</p>
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]">
                          {muscle.tone}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                        <div className="flex items-center justify-between">
                          <span>Sets</span>
                          <span className="font-medium">{muscle.totalSets}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Load</span>
                          <span className="font-medium">{Math.round(muscle.totalLoadKg)} kg</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>RPE medio</span>
                          <span className="font-medium">{muscle.averageRpe}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Recovery</span>
                          <span className="font-medium">{muscle.recoveryTimeHours}h</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[2.2rem] border border-white/8 bg-[#0d1724] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
                <p className="text-sm uppercase tracking-[0.24em] text-white/45">Balance de vectores</p>
                <div className="mt-4 grid gap-3">
                  {analysis.stimulusBalance.map((slice) => (
                    <div key={slice.stimulusVector} className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{stimulusLabel[slice.stimulusVector]}</p>
                        <span className="text-sm text-white/55">{slice.totalSets} sets</span>
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-[#4cb894]"
                          style={{
                            width: `${Math.max((slice.totalSets / Math.max(analysis.summary.totalSets, 1)) * 100, 8)}%`,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-sm text-white/52">
                        {Math.round(slice.totalLoadKg)} kg de volumen acumulado.
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
            <article className="rounded-[2.2rem] border border-white/8 bg-[#071019] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
              <p className="text-sm uppercase tracking-[0.24em] text-white/45">Lectura rapida</p>
              <ul className="mt-4 grid gap-3 text-sm leading-7 text-white/72">
                {analysis.recommendations.map((recommendation) => (
                  <li key={recommendation} className="rounded-[1.25rem] border border-white/8 bg-white/6 px-4 py-3">
                    {recommendation}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[2.2rem] border border-white/8 bg-[#0d1724] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-white/45">Historial real</p>
                  <p className="mt-1 text-sm leading-6 text-white/55">
                    {persistenceEnabled
                      ? "Sesiones persistidas en Supabase, listas para alimentar defaults futuros y la API nueva de ejercicios."
                      : "Todavia estas en preview. El layout ya esta listo para cuando todo el storage quede live."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refreshHistory}
                  disabled={isRefreshingHistory}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRefreshingHistory ? "Actualizando..." : "Refrescar"}
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {history.length > 0 ? (
                  history.map((savedSession) => (
                    <div
                      key={savedSession.sessionId}
                      className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold text-white">{savedSession.title}</p>
                          <p className="mt-1 text-sm text-white/52">{formatShortDate(savedSession.startedAt)}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/58">
                          {savedSession.totalSets} sets · {Math.round(savedSession.totalLoadKg)} kg
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-white/78 md:grid-cols-2">
                        <div className="flex items-center justify-between">
                          <span>Peak RPE</span>
                          <span className="font-medium">{savedSession.peakRpe}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>RPE medio</span>
                          <span className="font-medium">{savedSession.averageRpe}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {savedSession.topMuscles.map((muscle) => (
                          <span
                            key={`${savedSession.sessionId}-${muscle.muscleSlug}`}
                            className="rounded-full border border-white/10 bg-[#4cb894]/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#9cf3d3]"
                          >
                            {muscle.muscleName} · {muscle.totalSets} sets
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-4 text-sm text-white/52">
                    {persistenceEnabled
                      ? "Todavia no hay sesiones guardadas. Guarda la primera desde este builder."
                      : "Sin persistencia real por ahora. El builder sigue funcionando en memoria y preview."}
                  </div>
                )}
              </div>
            </article>
          </section>

            </>
          )}

            </motion.div>
          </AnimatePresence>
          </div>

        </div>
      ) : (
        <section className="grid gap-6 rounded-[2.2rem] border border-white/8 bg-[#050b13] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.4)] md:p-6">
          <div className="sticky top-3 z-10 rounded-[1.7rem] border border-white/10 bg-[#0b1420]/95 p-4 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/45">
                    Modo guerra
                  </span>
                  <span
                    className={`rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] ${readinessTone[analysis.readiness.status]}`}
                  >
                    readiness {analysis.readiness.status}
                  </span>
                  {selectedClient ? (
                    <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/55">
                      {selectedClient.fullName}
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{session.title}</h1>
                <p className="mt-2 text-sm text-white/55">
                  Cronometro arriba, sets tactiles y ejercicios colapsables. Sin tablas y sin teclado para cargar reps o kilos.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Sesion</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{formatDuration(elapsedSeconds)}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Descanso</p>
                  <p className="mt-1 text-2xl font-semibold text-[#9cf3d3]">{formatDuration(restSeconds)}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Sets</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{analysis.summary.totalSets}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowCatalog(true)}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#4cb894] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#63c7a5]"
              >
                + Agregar ejercicio
              </button>
              <button
                type="button"
                onClick={saveSession}
                disabled={isSaving}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Guardando..." : "Guardar sesion"}
              </button>
              <button
                type="button"
                onClick={closeLiveMode}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Volver al dashboard
              </button>
            </div>

            {saveMessage ? (
              <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {saveMessage}
              </p>
            ) : null}

            {historyError ? (
              <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {historyError}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4">
            {session.entries.map((entry, entryIndex) => {
              const collapseKey = entrySignature(entryIndex, entry.slug);
              const isCollapsed = collapsedEntries[collapseKey] ?? false;

              return (
                <article
                  key={collapseKey}
                  className="rounded-[1.8rem] border border-white/8 bg-[#0b1420] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-white">{entry.name}</h2>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                          {entry.category}
                        </span>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                          {stimulusLabel[entry.stimulusVector]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-white/52">
                        Primario {entry.primaryMuscle} · equipo {entry.equipment} · recovery {entry.recoveryTimeHours}h
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateEntry(entryIndex, (current) => ({
                            ...current,
                            sets: duplicateLastSet(current.sets),
                          }))
                        }
                        className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 text-sm font-medium text-white transition hover:bg-white/10"
                      >
                        + set
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleEntryCollapse(entryIndex, entry.slug)}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white transition hover:bg-white/10"
                      >
                        {isCollapsed ? "+" : "−"}
                      </button>
                    </div>
                  </div>

                  {!isCollapsed ? (
                    <div className="mt-4 grid gap-3">
                      {entry.sets.map((set, setIndex) => {
                        const key = getSetKey(entryIndex, setIndex);
                        const isCompleted = completedSets[key] ?? false;

                        return (
                          <div
                            key={`${entry.slug}-${setIndex}`}
                            className="grid gap-3 rounded-[1.5rem] border border-white/8 bg-black/20 p-3 xl:grid-cols-[auto_1fr_1fr_auto_auto] xl:items-center"
                          >
                            <button
                              type="button"
                              onClick={() => toggleSetCompleted(entryIndex, setIndex)}
                              className={`flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold transition ${
                                isCompleted
                                  ? "border-emerald-400/30 bg-emerald-500 text-slate-950"
                                  : "border-white/10 bg-white/6 text-white"
                              }`}
                            >
                              {setIndex + 1}
                            </button>

                            <StepperPill
                              label="kg"
                              value={`${formatRounded(set.weightKg ?? 0)} kg`}
                              onDecrement={() => updateSetMetric(entryIndex, setIndex, "weightKg", -2.5)}
                              onIncrement={() => updateSetMetric(entryIndex, setIndex, "weightKg", 2.5)}
                            />

                            <StepperPill
                              label="reps"
                              value={`${set.reps ?? 0} reps`}
                              onDecrement={() => updateSetMetric(entryIndex, setIndex, "reps", -1)}
                              onIncrement={() => updateSetMetric(entryIndex, setIndex, "reps", 1)}
                            />

                            <StepperPill
                              label="rpe"
                              value={`R${set.rpe ?? 0}`}
                              compact
                              onDecrement={() => updateSetMetric(entryIndex, setIndex, "rpe", -1)}
                              onIncrement={() => updateSetMetric(entryIndex, setIndex, "rpe", 1)}
                            />

                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => toggleSetCompleted(entryIndex, setIndex)}
                                className={`flex h-12 min-w-12 items-center justify-center rounded-2xl px-4 text-lg font-semibold transition ${
                                  isCompleted
                                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                                    : "bg-[#4cb894] text-slate-950 hover:bg-[#63c7a5]"
                                }`}
                              >
                                ✔
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSet(entryIndex, setIndex)}
                                disabled={entry.sets.length === 1}
                                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-base text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            updateSession((current) => ({
                              ...current,
                              entries: current.entries.filter((_, currentIndex) => currentIndex !== entryIndex),
                            }))
                          }
                          disabled={session.entries.length === 1}
                          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white/72 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          quitar ejercicio
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="sticky bottom-3 flex justify-center">
            <button
              type="button"
              onClick={() => setShowCatalog(true)}
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#4cb894] px-6 py-3 text-base font-semibold text-slate-950 shadow-[0_16px_40px_rgba(76,184,148,0.3)] transition hover:bg-[#63c7a5]"
            >
              + Agregar ejercicio
            </button>
          </div>
        </section>
      )}
    </div>
  );
}