"use client";

import {
  clientProfileAnalyticsResponseSchema,
  clientCreateResponseSchema,
  clientListResponseSchema,
  trainingHistoryResponseSchema,
  trainingSessionSaveResponseSchema,
  type BiomechanicalRadarAxis,
  type ClientProfileAnalytics,
  type ClientProfile,
  type PersistedTrainingSessionSummary,
  type TrainingSessionDraft,
  type WorkoutDraftSet,
} from "@musculator/contracts";
import {
  analyzeTrainingSession,
  createEntryFromCatalog,
  createTrainingTemplateSession,
  trainingExerciseCatalog,
  trainingTemplates,
} from "@musculator/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useGlobalOverlay } from "@/components/overlays/global-overlay-provider";
import { NutritionWorkspace } from "@/components/nutrition/nutrition-workspace";
import { ProfileDecisionRow } from "@/components/training/profile/profile-decision-row";
import { ProfileHero } from "@/components/training/profile/profile-hero";
import { useLiveSessionStore } from "@/lib/live/live-session-store";
import {
  emitChromeLock,
  softReplaceQuery,
  subscribeDashboardSurface,
  subscribeOpenLive,
} from "@/lib/navigation/app-events";
import { getSurfaceLabel } from "@/lib/navigation/app-nav-config";
import type { SetupCheck } from "@/lib/platform/setup";

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

type MuscleMapWidgetInstance = {
  setHeatmap: (
    data: Array<{ muscle: never; intensity: number }>,
    config: { colorScale: "workout"; gradientFill: boolean; gradientDirection: "topToBottom" },
  ) => void;
  destroy: () => void;
};

type MuscleMapWidgetCtor = new (
  container: HTMLElement,
  options: {
    gender: "male" | "female";
    side: "front" | "back";
    style: "default" | "minimal" | "neon" | "medical";
    interactive: boolean;
    multiSelect: boolean;
  },
) => MuscleMapWidgetInstance;

type AthleteSex = "male" | "female";

type MuscleMapModule = {
  MuscleMapWidget: MuscleMapWidgetCtor;
  ALL_MUSCLES?: string[];
};

let muscleMapModulePromise: Promise<MuscleMapModule> | null = null;
const loadExternalModule = new Function(
  "path",
  "return import(path);",
) as (path: string) => Promise<MuscleMapModule>;

function loadMuscleMapModule() {
  if (!muscleMapModulePromise) {
    muscleMapModulePromise = loadExternalModule("/vendors/musclemapjs/index.js");
  }

  return muscleMapModulePromise;
}

const muscleMapTargets: Record<string, string[]> = {
  pectoral: ["chest", "upper-chest", "lower-chest"],
  "deltoides-anterior": ["deltoids", "front-deltoid"],
  "deltoides-lateral": ["deltoids", "rear-deltoid"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  core: ["abs", "obliques", "upper-abs", "lower-abs"],
  cuadriceps: ["quadriceps", "inner-quad", "outer-quad"],
  pantorrilla: ["calves", "tibialis"],
  trapecio: ["trapezius", "upper-trapezius", "lower-trapezius"],
  dorsal: ["upper-back", "rhomboids"],
  gluteo: ["gluteal"],
  femoral: ["hamstring"],
};

const anatomyHeatmapConfig = {
  colorScale: "workout" as const,
  gradientFill: true,
  gradientDirection: "topToBottom" as const,
};

function toneToIntensity(tone: keyof typeof muscleTone) {
  if (tone === "high") {
    return 0.95;
  }
  if (tone === "moderate") {
    return 0.65;
  }
  return 0.3;
}

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

function extractOptionalMetricFromNotes(notes: string | undefined, pattern: RegExp) {
  if (!notes) {
    return null;
  }

  const match = notes.match(pattern);

  if (!match || !match[1]) {
    return null;
  }

  const normalized = Number(match[1].replace(",", "."));

  return Number.isFinite(normalized) ? normalized : null;
}

function parsePositiveInputMetric(raw: string) {
  const normalized = raw.replace(",", ".").trim();

  if (!normalized) {
    return Number.NaN;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function resolvePinnedClientId(clients: ClientProfile[], currentClientId: string | null) {
  const pinnedClient = clients.find((client) => /\btadeo?\b/i.test(client.fullName.trim()));

  if (pinnedClient) {
    return pinnedClient.id;
  }

  if (currentClientId && clients.some((client) => client.id === currentClientId)) {
    return currentClientId;
  }

  return clients[0]?.id ?? null;
}

async function parseResponseBody(response: Response) {
  const bodyText = await response.text();

  if (!bodyText) {
    return {
      raw: null as unknown,
      bodyText,
    };
  }

  try {
    return {
      raw: JSON.parse(bodyText) as unknown,
      bodyText,
    };
  } catch {
    return {
      raw: null as unknown,
      bodyText,
    };
  }
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

function inferBiomechanicalAxes(history: PersistedTrainingSessionSummary[]): BiomechanicalRadarAxis[] {
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
    {
      key: "verticalPull",
      label: "Traccion vertical",
      actualPercent: Math.round((totals.verticalPull / maxValue) * 100),
      targetPercent: Math.round((totals.verticalPull / maxValue) * 100),
      gapPercent: 0,
    },
    {
      key: "horizontalPull",
      label: "Traccion horizontal",
      actualPercent: Math.round((totals.horizontalPull / maxValue) * 100),
      targetPercent: Math.round((totals.horizontalPull / maxValue) * 100),
      gapPercent: 0,
    },
    {
      key: "push",
      label: "Empuje",
      actualPercent: Math.round((totals.push / maxValue) * 100),
      targetPercent: Math.round((totals.push / maxValue) * 100),
      gapPercent: 0,
    },
    {
      key: "posteriorChain",
      label: "Cadena posterior",
      actualPercent: Math.round((totals.posteriorChain / maxValue) * 100),
      targetPercent: Math.round((totals.posteriorChain / maxValue) * 100),
      gapPercent: 0,
    },
    {
      key: "conditioning",
      label: "Acondicionamiento",
      actualPercent: Math.round((totals.conditioning / maxValue) * 100),
      targetPercent: Math.round((totals.conditioning / maxValue) * 100),
      gapPercent: 0,
    },
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

function splitRadarLabel(label: string) {
  const words = label.split(" ");

  if (words.length <= 1) {
    return [label];
  }

  if (words.length === 2) {
    return words;
  }

  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

function BiomechanicalRadar({
  axes,
}: {
  axes: BiomechanicalRadarAxis[];
}) {
  if (axes.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm text-white/60">
        Sin ejes biomecánicos disponibles para este atleta.
      </div>
    );
  }

  const center = 120;
  const radius = 72;
  const gridSteps = 5;

  return (
    <div className="min-w-0 rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="grid min-w-0 items-center gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[260px]">
          <svg viewBox="0 0 240 240" className="block aspect-square h-auto w-full overflow-hidden">
            <defs>
              <linearGradient id="radarActualGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4cb894" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#9cf3d3" stopOpacity="0.22" />
              </linearGradient>
              <linearGradient id="radarTargetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.08" />
              </linearGradient>
            </defs>
            {getRadarGridPolygon(gridSteps, axes.length, radius, center).map((polygon, index) => (
              <polygon
                key={polygon}
                points={polygon}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={index === gridSteps - 1 ? 1.4 : 1}
              />
            ))}
            {axes.map((axis, index) => {
              const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
              const x = center + Math.cos(angle) * (radius + 12);
              const y = center + Math.sin(angle) * (radius + 12);

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
              points={getRadarPolygon(axes.map((axis) => axis.targetPercent), radius, center)}
              fill="url(#radarTargetGradient)"
              stroke="rgba(125,211,252,0.8)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <polygon
              points={getRadarPolygon(axes.map((axis) => axis.actualPercent), radius, center)}
              fill="url(#radarActualGradient)"
              stroke="#4cb894"
              strokeWidth="2"
            />
            {axes.map((axis, index) => {
              const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
              const x = center + Math.cos(angle) * ((radius * axis.actualPercent) / 100);
              const y = center + Math.sin(angle) * ((radius * axis.actualPercent) / 100);

              return <circle key={`${axis.key}-dot`} cx={x} cy={y} r="4" fill="#9cf3d3" />;
            })}
            {axes.map((axis, index) => {
              const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
              const labelRadius = radius + 16;
              const x = center + Math.cos(angle) * labelRadius;
              const y = center + Math.sin(angle) * labelRadius;
              const anchor = x < center - 10 ? "end" : x > center + 10 ? "start" : "middle";
              const lines = splitRadarLabel(axis.label);

              return (
                <text
                  key={`${axis.key}-edge-label`}
                  x={x}
                  y={y}
                  textAnchor={anchor}
                  fill="rgba(255,255,255,0.72)"
                  fontSize="8.5"
                  letterSpacing="0.04em"
                >
                  {lines.map((line, lineIndex) => (
                    <tspan
                      key={`${axis.key}-line-${lineIndex}`}
                      x={x}
                      dy={lineIndex === 0 ? (lines.length > 1 ? "-0.2em" : "0.3em") : "1em"}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            })}
          </svg>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {axes.map((axis) => (
            <div
              key={axis.key}
              className="min-w-0 rounded-[1.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-sm font-medium leading-5 text-white">{axis.label}</p>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-[#9cf3d3]">
                  {axis.actualPercent}%
                </span>
              </div>
              <div className="relative mt-3 h-2 rounded-full bg-black/30">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-[#4cb894] via-[#65c7a8] to-[#8df2ce]"
                  style={{ width: `${Math.max(axis.actualPercent, 8)}%` }}
                />
                <div
                  className="absolute inset-y-[-2px] w-[2px] -translate-x-1/2 rounded-full bg-sky-200/85"
                  style={{ left: `${clamp(axis.targetPercent, 0, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/50">
                objetivo {axis.targetPercent}% · gap {axis.gapPercent > 0 ? "+" : ""}
                {axis.gapPercent}%
              </p>
            </div>
          ))}
        </div>
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
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const frontWidgetRef = useRef<MuscleMapWidgetInstance | null>(null);
  const backWidgetRef = useRef<MuscleMapWidgetInstance | null>(null);
  const latestHeatmapDataRef = useRef<Array<{ muscle: never; intensity: number }>>([]);
  const [supportedMuscles, setSupportedMuscles] = useState<Set<string> | null>(null);
  const heatmapData = useMemo(() => {
    const intensities = new Map<string, number>();

    for (const muscle of muscles) {
      const mapped = muscleMapTargets[muscle.muscle] ?? [];
      const intensity = toneToIntensity(muscle.tone);

      for (const target of mapped) {
        if (supportedMuscles && !supportedMuscles.has(target)) {
          continue;
        }
        const current = intensities.get(target) ?? 0;
        intensities.set(target, Math.max(current, intensity));
      }
    }

    return Array.from(intensities.entries()).map(([targetMuscle, intensity]) => ({
      muscle: targetMuscle as never,
      intensity,
    }));
  }, [muscles, supportedMuscles]);

  useEffect(() => {
    latestHeatmapDataRef.current = heatmapData;
    frontWidgetRef.current?.setHeatmap(heatmapData, anatomyHeatmapConfig);
    backWidgetRef.current?.setHeatmap(heatmapData, anatomyHeatmapConfig);
  }, [heatmapData]);

  useEffect(() => {
    if (!frontRef.current || !backRef.current) {
      return;
    }

    let cancelled = false;

    const mountMaps = async () => {
      const muscleMapModule = await loadMuscleMapModule();

      if (cancelled || !frontRef.current || !backRef.current) {
        return;
      }

      if (muscleMapModule.ALL_MUSCLES && muscleMapModule.ALL_MUSCLES.length > 0) {
        setSupportedMuscles(new Set(muscleMapModule.ALL_MUSCLES));
      }

      const MuscleMapWidget = muscleMapModule.MuscleMapWidget;
      frontWidgetRef.current?.destroy();
      backWidgetRef.current?.destroy();

      frontWidgetRef.current = new MuscleMapWidget(frontRef.current, {
        gender: "male",
        side: "front",
        style: "medical",
        interactive: false,
        multiSelect: false,
      });

      backWidgetRef.current = new MuscleMapWidget(backRef.current, {
        gender: "male",
        side: "back",
        style: "medical",
        interactive: false,
        multiSelect: false,
      });

      const currentHeatmapData = latestHeatmapDataRef.current;
      frontWidgetRef.current.setHeatmap(currentHeatmapData, anatomyHeatmapConfig);
      backWidgetRef.current.setHeatmap(currentHeatmapData, anatomyHeatmapConfig);
    };

    void mountMaps();

    return () => {
      cancelled = true;
      frontWidgetRef.current?.destroy();
      backWidgetRef.current?.destroy();
      frontWidgetRef.current = null;
      backWidgetRef.current = null;
    };
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-w-0 rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,#091522,#070f18)] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">Frente</p>
          <span className="text-[10px] uppercase tracking-[0.16em] text-white/42">vista anterior</span>
        </div>
        <div ref={frontRef} className="mt-3 h-[260px] w-full overflow-hidden rounded-[1.2rem] bg-[#070f18]" />
      </div>

      <div className="min-w-0 rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,#091522,#070f18)] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">Espalda</p>
          <span className="text-[10px] uppercase tracking-[0.16em] text-white/42">vista posterior</span>
        </div>
        <div ref={backRef} className="mt-3 h-[260px] w-full overflow-hidden rounded-[1.2rem] bg-[#070f18]" />
      </div>
    </div>
  );
}

function formatLoadKg(value: number) {
  const rounded = Math.round(value);

  if (rounded >= 10000) {
    return `${(rounded / 1000).toFixed(1).replace(/\.0$/, "")}k kg`;
  }

  return `${rounded.toLocaleString("es-AR")} kg`;
}

function MuscleRecoveryCard({
  muscle,
}: {
  muscle: {
    muscle: string;
    label: string;
    category: string;
    tone: keyof typeof muscleTone;
    recoveryTimeHours: number;
    totalSets: number;
    averageRpe: number;
    totalLoadKg: number;
  };
}) {
  const metrics = [
    { label: "Sets", value: String(muscle.totalSets) },
    { label: "RPE medio", value: String(muscle.averageRpe) },
    { label: "Load", value: formatLoadKg(muscle.totalLoadKg) },
  ] as const;

  return (
    <div className={`min-w-0 overflow-hidden rounded-[1.35rem] border p-4 ${muscleTone[muscle.tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{muscle.label}</p>
          <p className="mt-0.5 truncate text-sm opacity-75">{muscle.category}</p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full bg-black/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em]">
          {muscle.recoveryTimeHours}h
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 rounded-[0.95rem] bg-black/20 px-2.5 py-2.5">
            <p className="truncate text-[10px] uppercase tracking-[0.12em] opacity-65">{metric.label}</p>
            <p className="mt-1 truncate text-base font-semibold tabular-nums leading-none sm:text-lg">{metric.value}</p>
          </div>
        ))}
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

function toLocalDateTimeInputValue(value: string | undefined) {
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

function toIsoFromLocalDateTimeInput(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
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
  initialLive?: boolean;
}

export interface TrainingWorkspaceBootstrapData {
  storageMode: "supabase" | "noop";
  clients: ClientProfile[];
  selectedClientId: string | null;
  history: PersistedTrainingSessionSummary[];
  profileAnalytics: ClientProfileAnalytics | null;
}

export type DashboardSurface = "profile" | "nutrition" | "clients";

export function TrainingWorkspace({
  initialSession,
  integrations,
  bootstrap,
  initialSurface = "profile",
  initialLive = false,
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
  const [isLaunchingLive, setIsLaunchingLive] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(trainingTemplates[0]?.id ?? "pull-density");
  const startLiveSession = useLiveSessionStore((state) => state.startLiveSession);
  const [showAthleteOnboarding, setShowAthleteOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [isResolvingClients, setIsResolvingClients] = useState(false);
  const [hasResolvedInitialClients, setHasResolvedInitialClients] = useState(Boolean(bootstrap));
  const [clientForm, setClientForm] = useState({
    fullName: "",
    goal: "",
    notes: "",
  });
  const [athleteOnboardingForm, setAthleteOnboardingForm] = useState<{
    fullName: string;
    sex: AthleteSex;
    ageYears: string;
    weightKg: string;
    heightCm: string;
  }>({
    fullName: "",
    sex: "male",
    ageYears: "",
    weightKg: "",
    heightCm: "",
  });
  const [activeCategory, setActiveCategory] = useState(catalogCategories[0] ?? "Espalda");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [sessionStartedAt] = useState<number | null>(null);
  const [restSeconds, setRestSeconds] = useState(0);
  const [clockNow, setClockNow] = useState(Date.now());
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [collapsedEntries, setCollapsedEntries] = useState<Record<string, boolean>>({});
  const [isPending, startTemplateTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();
  const [isCreatingClient, startClientTransition] = useTransition();
  const [isRefreshingHistory, startHistoryTransition] = useTransition();
  const [isRefreshingAnalytics, startAnalyticsTransition] = useTransition();
  const [isDeletingSession, startDeleteSessionTransition] = useTransition();
  const [history, setHistory] = useState<PersistedTrainingSessionSummary[]>(bootstrap?.history ?? []);
  const [profileAnalytics, setProfileAnalytics] = useState<ClientProfileAnalytics | null>(
    bootstrap?.profileAnalytics ?? null,
  );
  const [storageMode, setStorageMode] = useState<"supabase" | "noop">(bootstrap?.storageMode ?? "noop");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<string | null>(null);
  const [bodyInsightsView, setBodyInsightsView] = useState<"anatomy" | "biomechanics">("anatomy");
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const skippedBootstrapHistory = useRef(false);
  const skippedBootstrapAnalytics = useRef(false);

  const deferredSession = useDeferredValue(session);
  const analysis = useMemo(
    () => analyzeTrainingSession(deferredSession),
    [deferredSession],
  );
  const persistenceEnabled = storageMode === "supabase";
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const latestSession = history[0];
  const readyIntegrations = integrations.filter((item) => item.ready).length;
  const elapsedSeconds = sessionStartedAt
    ? Math.max(Math.floor((clockNow - sessionStartedAt) / 1000), 0)
    : 0;
  const recentTitles = useMemo(() => history.slice(0, 3).map((item) => item.title), [history]);
  const heatmapDays = useMemo(() => buildConsistencyHeatmap(history), [history]);
  const activeHeatmapDay = heatmapDays.find((day) => day.dateKey === selectedHeatmapDay) ?? null;
  const recentActiveDays = useMemo(
    () => heatmapDays.slice(-7).filter((day) => day.sessions.length > 0).length,
    [heatmapDays],
  );
  const hasSessionHistory = history.length > 0;
  const hasAnalyticsSignals = useMemo(() => {
    if (!profileAnalytics) {
      return false;
    }

    if (
      profileAnalytics.weeklyNeuralCost > 0 ||
      profileAnalytics.recoveryGapHours > 0 ||
      profileAnalytics.nutritionRecoveryGap > 0
    ) {
      return true;
    }

    return profileAnalytics.stimulusBalance.some(
      (slice) => slice.actualSets > 0 || slice.actualLoadKg > 0,
    );
  }, [profileAnalytics]);
  const hasProfileInsights = hasSessionHistory || hasAnalyticsSignals;
  const fallbackBiomechanicalAxes = useMemo(() => inferBiomechanicalAxes(history), [history]);
  const biomechanicalAxes = profileAnalytics?.radarAxes ?? fallbackBiomechanicalAxes;
  const weakestBiomechanicalAxis = useMemo(
    () => [...biomechanicalAxes].sort((left, right) => left.actualPercent - right.actualPercent)[0],
    [biomechanicalAxes],
  );
  const profileReadiness =
    profileAnalytics?.readiness ??
    (hasSessionHistory
      ? analysis.readiness
      : {
          score: 0,
          status: "amber" as const,
          localPenalty: 0,
          centralPenalty: 0,
          recoveryBonus: 0,
        });
  const weeklyNeuralCost =
    profileAnalytics?.weeklyNeuralCost ??
    (hasSessionHistory ? Number((analysis.summary.totalSets * 7.4).toFixed(1)) : 0);
  const weeklyNeuralTarget = profileAnalytics?.weeklyNeuralTarget ?? (hasSessionHistory ? weeklyNeuralCost : 0);
  const weeklyNeuralDelta = profileAnalytics?.weeklyNeuralDelta ?? 0;
  const weeklyNeuralProgressPercent = hasProfileInsights
    ? Math.round((weeklyNeuralCost / Math.max(weeklyNeuralTarget, 1)) * 100)
    : 0;
  const weeklyNeuralProgressBarPercent = hasProfileInsights
    ? clamp(weeklyNeuralProgressPercent, 10, 100)
    : 0;
  const weeklyNeuralOverflowPercent = Math.max(weeklyNeuralProgressPercent - 100, 0);
  const recoveryGapHours = profileAnalytics?.recoveryGapHours ?? 0;
  const nutritionRecoveryGap = profileAnalytics?.nutritionRecoveryGap ?? 0;
  const nutritionSupportRatio =
    profileAnalytics?.nutritionSupportRatio ??
    (hasSessionHistory
      ? Number(((session.recoveryInputs.carbsTargetRatio + session.recoveryInputs.hydrationTargetRatio) / 2).toFixed(2))
      : 0);
  const targetSupportRatio = profileAnalytics?.targetSupportRatio ?? 1;
  const profileStimulusBalance = useMemo(
    () => {
      if (profileAnalytics) {
        if (!hasProfileInsights) {
          return [];
        }

        return profileAnalytics.stimulusBalance.map((slice) => ({
          stimulusVector: slice.stimulusVector,
          totalSets: slice.actualSets,
          totalLoadKg: slice.actualLoadKg,
          targetSets: slice.targetSets,
        }));
      }

      if (!hasSessionHistory) {
        return [];
      }

      return analysis.stimulusBalance.map((slice) => ({
        stimulusVector: slice.stimulusVector,
        totalSets: slice.totalSets,
        totalLoadKg: slice.totalLoadKg,
        targetSets: slice.totalSets,
      }));
    },
    [analysis.stimulusBalance, hasProfileInsights, hasSessionHistory, profileAnalytics],
  );
  const referencePlanLabel =
    profileAnalytics?.referenceProtocolName ??
    profileAnalytics?.referenceTemplateName ??
    "Sin plantilla/protocolo activo";
  const age = extractOptionalMetricFromNotes(selectedClient?.notes, /(\d{2})\s*(?:anos|a\b|años)/i);
  const heightMeters = extractOptionalMetricFromNotes(selectedClient?.notes, /(1\.[4-9]\d?)\s*m/i);
  const weightKg = extractOptionalMetricFromNotes(selectedClient?.notes, /(\d{2,3}(?:[\.,]\d)?)\s*kg/i);
  const weightKgForPlanning = weightKg ?? 78;
  const consistencyLabel =
    recentActiveDays >= 3 ? "consistente" : recentActiveDays > 0 ? "en construcción" : "sin dato";
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
  const profileHeroMetrics = useMemo(
    () => [
      {
        label: "Edad",
        value: age !== null ? `${Math.round(age)} años` : "Sin dato",
        trust: age !== null ? ("estimado" as const) : ("sin dato" as const),
      },
      {
        label: "Altura",
        value: heightMeters !== null ? `${heightMeters.toFixed(2)} m` : "Sin dato",
        trust: heightMeters !== null ? ("estimado" as const) : ("sin dato" as const),
      },
      {
        label: "Peso",
        value: weightKg !== null ? `${weightKg.toFixed(1)} kg` : "Sin dato",
        detail: consistencyLabel,
        trust: weightKg !== null ? ("estimado" as const) : ("sin dato" as const),
      },
      {
        label: "Fase",
        value: mesocycleLabel,
        detail: `Semana ${mesocycleWeek}/6`,
        trust: selectedClient?.goal ? ("medido" as const) : ("sin dato" as const),
      },
    ],
    [age, consistencyLabel, heightMeters, mesocycleLabel, mesocycleWeek, selectedClient?.goal, weightKg],
  );
  const focusMuscles = useMemo(
    () =>
      Array.from(
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
        .slice(0, 4),
    [history],
  );
  const weeklyTotalLoad = useMemo(() => {
    const weeklyWindowStart = new Date();
    weeklyWindowStart.setHours(0, 0, 0, 0);
    weeklyWindowStart.setDate(weeklyWindowStart.getDate() - 6);

    return history
      .filter((item) => new Date(item.startedAt) >= weeklyWindowStart)
      .reduce((sum, item) => sum + item.totalLoadKg, 0);
  }, [history]);
  const muscleMetadataBySlug = useMemo(
    () =>
      analysis.muscleLoad.reduce(
        (accumulator, muscle) => {
          accumulator.set(muscle.muscle, {
            label: muscle.label,
            category: muscle.category,
            recoveryTimeHours: muscle.recoveryTimeHours,
          });

          return accumulator;
        },
        new Map<string, { label: string; category: string; recoveryTimeHours: number }>(),
      ),
    [analysis.muscleLoad],
  );
  const historyMuscleLoad = useMemo(() => {
    const aggregate = history.reduce(
      (accumulator, sessionSummary) => {
        for (const muscle of sessionSummary.topMuscles) {
          const current = accumulator.get(muscle.muscleSlug) ?? {
            muscle: muscle.muscleSlug,
            label: muscle.muscleName,
            category: "Histórico",
            totalSets: 0,
            totalLoadKg: 0,
            recoveryTimeHours: 48,
            averageRpe: 0,
            tone: "low" as keyof typeof muscleTone,
          };
          const metadata = muscleMetadataBySlug.get(muscle.muscleSlug);

          current.label = metadata?.label ?? current.label;
          current.category = metadata?.category ?? current.category;
          current.recoveryTimeHours = metadata?.recoveryTimeHours ?? current.recoveryTimeHours;
          current.totalSets += muscle.totalSets;
          current.totalLoadKg += muscle.totalLoadKg;
          accumulator.set(muscle.muscleSlug, current);
        }

        return accumulator;
      },
      new Map<
        string,
        {
          muscle: string;
          label: string;
          category: string;
          totalSets: number;
          totalLoadKg: number;
          recoveryTimeHours: number;
          averageRpe: number;
          tone: keyof typeof muscleTone;
        }
      >(),
    );

    return [...aggregate.values()]
      .map((item) => ({
        ...item,
        tone: (item.totalSets >= 12 ? "high" : item.totalSets >= 6 ? "moderate" : "low") as
          | "low"
          | "moderate"
          | "high",
      }))
      .sort(
        (left, right) =>
          right.totalSets - left.totalSets || right.totalLoadKg - left.totalLoadKg,
      );
  }, [history, muscleMetadataBySlug]);
  const recoveryCatalog = useMemo(
    () => {
      if (!hasSessionHistory) {
        return [];
      }

      return [...historyMuscleLoad].sort(
        (left, right) =>
          right.recoveryTimeHours - left.recoveryTimeHours || right.totalSets - left.totalSets,
      );
    },
    [hasSessionHistory, historyMuscleLoad],
  );
  const priorityRecoveryMuscles = useMemo(() => recoveryCatalog.slice(0, 5), [recoveryCatalog]);
  const nextActionSuggestion = hasProfileInsights
    ? weakestBiomechanicalAxis
      ? `Reforzá ${weakestBiomechanicalAxis.label.toLowerCase()} en el próximo bloque para equilibrar el estímulo del atleta.`
      : "Todavía no hay una sugerencia prioritaria calculada para este bloque."
    : "Sin historial todavía. Guardá la primera sesión para generar recomendaciones reales del atleta.";
  const readinessLabel = hasProfileInsights ? readinessPalette[profileReadiness.status].label : "Sin datos todavía";
  const readinessToneClass = hasProfileInsights
    ? readinessTone[profileReadiness.status]
    : "border-slate-400/20 bg-slate-500/10 text-slate-200";
  const readinessRingColor = hasProfileInsights ? readinessPalette[profileReadiness.status].solid : "#64748b";
  const readinessRingSoft = hasProfileInsights
    ? readinessPalette[profileReadiness.status].soft
    : "rgba(100,116,139,0.18)";
  const showCriticalAlert = hasProfileInsights && profileReadiness.status === "red";
  const athleteTitle = selectedClient?.fullName ?? "Perfil del atleta";
  const selectDashboardSurface = useCallback((surface: DashboardSurface) => {
    startTransition(() => {
      setDashboardSurface(surface);
      softReplaceQuery({
        surface: surface === "profile" ? null : surface,
        live: null,
      });
    });
  }, []);
  const openProfileForClient = useCallback(
    (clientId: string) => {
      setHistoryError(null);
      setSelectedClientId(clientId);
      selectDashboardSurface("profile");
    },
    [selectDashboardSurface],
  );

  const openLiveMode = useCallback(() => {
    setHistoryError(null);
    setShowCheckIn(true);
  }, []);

  const openReadinessSheet = () => {
    openSheet({
      title: "Readiness SNC",
      description: "Lectura detallada del estado neural y de la agresividad sugerida para la sesión.",
      content: (
        <div className="grid gap-3 text-sm text-white/72">
          <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Score actual</p>
            <p className="mt-3 text-4xl font-semibold text-white">{profileReadiness.score}</p>
            <p className="mt-2 text-sm text-white/58">{readinessLabel}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Penalidad central</p>
              <p className="mt-3 text-2xl font-semibold text-white">{formatRounded(profileReadiness.centralPenalty)}</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Penalidad local</p>
              <p className="mt-3 text-2xl font-semibold text-white">{formatRounded(profileReadiness.localPenalty)}</p>
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4 leading-7">
            {hasProfileInsights
              ? "Se calcula con sobrecarga neural semanal, gap de recuperación dinámica y soporte nutricional capturado en sesiones reales del cliente."
              : "Todavía no hay sesiones guardadas para este atleta. Guardá la primera sesión y acá se activa la lectura real de readiness."}
          </div>
        </div>
      ),
    });
  };

  const openMetabolicSheet = () => {
    openSheet({
      title: "Estado metabolico",
      description: "Costo neural semanal y soporte de recuperación nutricional contra el objetivo del bloque.",
      content: (
        <div className="grid gap-3 text-sm text-white/72">
          <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Costo neural semanal</p>
            <p className="mt-3 text-4xl font-semibold text-white">{weeklyNeuralCost}</p>
            <p className="mt-2 text-sm text-white/58">objetivo {weeklyNeuralTarget} · delta {weeklyNeuralDelta > 0 ? "+" : ""}{weeklyNeuralDelta}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Support ratio</p>
              <p className="mt-3 text-2xl font-semibold text-white">{nutritionSupportRatio.toFixed(2)}</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Gap nutricional</p>
              <p className="mt-3 text-2xl font-semibold text-white">{Math.round(nutritionRecoveryGap * 100)}%</p>
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4 leading-7">
            Plan de referencia: {referencePlanLabel}. Ratio objetivo {targetSupportRatio.toFixed(2)} contra soporte real {nutritionSupportRatio.toFixed(2)}.
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
            <MuscleRecoveryCard key={muscle.muscle} muscle={muscle} />
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
                <span className="text-sm text-white/58">{axis.actualPercent}% (objetivo {axis.targetPercent}%)</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-black/30">
                <div className="h-2 rounded-full bg-[#4cb894]" style={{ width: `${Math.max(axis.actualPercent, 4)}%` }} />
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

  const onboardingCanSubmit =
    athleteOnboardingForm.fullName.trim().length >= 2 &&
    Number.isFinite(parsePositiveInputMetric(athleteOnboardingForm.ageYears)) &&
    Number.isFinite(parsePositiveInputMetric(athleteOnboardingForm.weightKg)) &&
    Number.isFinite(parsePositiveInputMetric(athleteOnboardingForm.heightCm));

  const persistClientProfile = useCallback(
    async (payload: { fullName: string; goal?: string; notes?: string }) => {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
      }

      return data.client ?? null;
    },
    [],
  );

  const refreshClients = useCallback(() => {
    setIsResolvingClients(true);
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
          return resolvePinnedClientId(data.clients, current);
        });
      } catch (caughtError) {
        setClients([]);
        setSelectedClientId(null);
        setHistoryError(
          caughtError instanceof Error ? caughtError.message : "No se pudieron leer los clientes.",
        );
      } finally {
        setIsResolvingClients(false);
        setHasResolvedInitialClients(true);
      }
    });
  }, [startClientTransition]);

  const refreshHistory = useCallback(() => {
    startHistoryTransition(async () => {
      try {
        setHistoryError(null);

        if (!selectedClientId) {
          setHistory([]);
          return;
        }

        const response = await fetch(`/api/training/sessions?clientId=${selectedClientId}&limit=84`, {
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
  }, [selectedClientId, startHistoryTransition]);

  const refreshProfileAnalytics = useCallback(() => {
    startAnalyticsTransition(async () => {
      try {
        if (!selectedClientId) {
          setProfileAnalytics(null);
          return;
        }

        const response = await fetch(`/api/clients?analytics=1&clientId=${selectedClientId}`, {
          method: "GET",
          cache: "no-store",
        });
        const raw = (await response.json()) as unknown;

        if (!response.ok) {
          const message =
            typeof raw === "object" && raw && "error" in raw && typeof raw.error === "string"
              ? raw.error
              : "No se pudo leer la analítica de perfil.";

          throw new Error(message);
        }

        const data = clientProfileAnalyticsResponseSchema.parse(raw);
        setProfileAnalytics(data.analytics);
        setStorageMode(data.storage);
      } catch (caughtError) {
        setProfileAnalytics(null);
        setHistoryError(
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudo leer la analítica de perfil.",
        );
      }
    });
  }, [selectedClientId, startAnalyticsTransition]);

  const deletePersistedSession = (sessionId: string) => {
    if (!selectedClientId) {
      setHistoryError("Primero selecciona un cliente.");
      return;
    }

    const confirmed = window.confirm("¿Eliminar esta sesion del historial? Esta accion no se puede deshacer.");

    if (!confirmed) {
      return;
    }

    startDeleteSessionTransition(async () => {
      try {
        setHistoryError(null);
        setSaveMessage(null);
        setDeletingSessionId(sessionId);

        const response = await fetch(
          `/api/training/sessions?clientId=${selectedClientId}&sessionId=${sessionId}`,
          {
            method: "DELETE",
          },
        );
        const raw = (await response.json()) as unknown;

        if (!response.ok) {
          const message =
            typeof raw === "object" && raw && "error" in raw && typeof raw.error === "string"
              ? raw.error
              : "No se pudo eliminar la sesion.";

          throw new Error(message);
        }

        setHistory((current) =>
          current.filter((currentSession) => currentSession.sessionId !== sessionId),
        );
        setSaveMessage("Sesion eliminada del historial.");

        refreshHistory();
        refreshProfileAnalytics();
      } catch (caughtError) {
        setHistoryError(
          caughtError instanceof Error ? caughtError.message : "No se pudo eliminar la sesion.",
        );
      } finally {
        setDeletingSessionId(null);
      }
    });
  };

  useEffect(() => {
    setDashboardSurface(initialSurface);
  }, [initialSurface]);

  useEffect(() => {
    router.prefetch("/session/preview");
  }, [router]);

  useEffect(() => {
    if (!initialLive) {
      return;
    }

    setShowCheckIn(true);
    setHistoryError(null);
    softReplaceQuery({ live: null });
  }, [initialLive]);

  useEffect(() => {
    return subscribeDashboardSurface((surface) => {
      selectDashboardSurface(surface);
    });
  }, [selectDashboardSurface]);

  useEffect(() => {
    return subscribeOpenLive(() => {
      openLiveMode();
    });
  }, [openLiveMode]);

  useEffect(() => {
    emitChromeLock(showCheckIn);
    return () => emitChromeLock(false);
  }, [showCheckIn]);

  useEffect(() => {
    if (!bootstrap) {
      refreshClients();
    }
  }, [bootstrap, refreshClients]);

  useEffect(() => {
    if (!hasResolvedInitialClients || isResolvingClients) {
      return;
    }

    setShowAthleteOnboarding(persistenceEnabled && clients.length === 0);
  }, [clients.length, hasResolvedInitialClients, isResolvingClients, persistenceEnabled]);

  useEffect(() => {
    const pinnedClientId = resolvePinnedClientId(clients, selectedClientId);

    if (pinnedClientId !== selectedClientId) {
      setSelectedClientId(pinnedClientId);
    }
  }, [clients, selectedClientId]);

  useEffect(() => {
    const storedClientId = window.localStorage.getItem("musculator:selected-client-id");

    if (!storedClientId) {
      return;
    }

    if (clients.some((client) => client.id === storedClientId)) {
      setSelectedClientId((current) => current ?? storedClientId);
      return;
    }

    if (clients.length > 0) {
      window.localStorage.removeItem("musculator:selected-client-id");
    }
  }, [clients]);

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
  }, [bootstrap, refreshHistory, selectedClientId]);

  useEffect(() => {
    if (
      bootstrap &&
      !skippedBootstrapAnalytics.current &&
      selectedClientId === bootstrap.selectedClientId
    ) {
      skippedBootstrapAnalytics.current = true;
      return;
    }

    refreshProfileAnalytics();
  }, [bootstrap, refreshProfileAnalytics, selectedClientId]);

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
      setSession((current) => {
        const nextTemplateSession = createTrainingTemplateSession(templateId);

        return {
          ...nextTemplateSession,
          startedAt: current.startedAt ?? nextTemplateSession.startedAt,
        };
      });
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
        const { raw, bodyText } = await parseResponseBody(response);

        if (!raw && /<!doctype html>|<html/i.test(bodyText)) {
          throw new Error(
            "El servidor devolvió HTML en vez de JSON (error temporal del runtime). Reiniciá el dev server y recargá la página.",
          );
        }

        if (!response.ok) {
          const message =
            typeof raw === "object" && raw && "error" in raw && typeof raw.error === "string"
              ? raw.error
              : bodyText.trim().slice(0, 180) || "No se pudo guardar la sesion.";

          throw new Error(message);
        }

        if (!raw) {
          throw new Error("Respuesta inválida del servidor al guardar la sesión.");
        }

        const data = trainingSessionSaveResponseSchema.parse(raw);

        setSaveMessage(
          data.storage === "supabase"
            ? `Sesion guardada${data.sessionId ? ` · ${data.sessionId.slice(0, 8)}` : ""}`
            : "Persistencia en preview: faltan variables server-side de Supabase.",
        );

        refreshHistory();
        refreshProfileAnalytics();
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

  const createClientProfile = () => {
    startClientTransition(async () => {
      try {
        setHistoryError(null);
        const payload: { fullName: string; goal?: string; notes?: string } = {
          fullName: clientForm.fullName.trim(),
        };

        const normalizedGoal = clientForm.goal.trim();
        const normalizedNotes = clientForm.notes.trim();

        if (normalizedGoal) {
          payload.goal = normalizedGoal;
        }

        if (normalizedNotes) {
          payload.notes = normalizedNotes;
        }

        const createdClient = await persistClientProfile(payload);

        if (createdClient) {
          setClientForm({
            fullName: "",
            goal: "",
            notes: "",
          });
        } else {
          throw new Error("No se pudo crear el cliente. Revisá la conexión y volvé a intentar.");
        }
      } catch (caughtError) {
        setHistoryError(
          caughtError instanceof Error ? caughtError.message : "No se pudo crear el cliente.",
        );
      }
    });
  };

  const createAthleteFromOnboarding = () => {
    startClientTransition(async () => {
      try {
        setHistoryError(null);
        setOnboardingError(null);

        const fullName = athleteOnboardingForm.fullName.trim();
        const ageYears = parsePositiveInputMetric(athleteOnboardingForm.ageYears);
        const weightKg = parsePositiveInputMetric(athleteOnboardingForm.weightKg);
        const heightCm = parsePositiveInputMetric(athleteOnboardingForm.heightCm);

        if (fullName.length < 2) {
          throw new Error("Escribí un nombre válido para crear el atleta.");
        }

        if (!Number.isFinite(weightKg) || weightKg < 35 || weightKg > 280) {
          throw new Error("Ingresá un peso válido en kg.");
        }

        if (!Number.isFinite(ageYears) || ageYears < 12 || ageYears > 100) {
          throw new Error("Ingresá una edad válida.");
        }

        if (!Number.isFinite(heightCm) || heightCm < 130 || heightCm > 230) {
          throw new Error("Ingresá una altura válida en cm.");
        }

        const heightMeters = heightCm / 100;
        const sexLabel = athleteOnboardingForm.sex === "female" ? "mujer" : "hombre";
        const notes = `${Math.round(ageYears)} años. Sexo: ${sexLabel}. ${heightMeters.toFixed(2)} m. ${weightKg.toFixed(1)} kg.`;
        const defaultGoal =
          athleteOnboardingForm.sex === "female"
            ? "Base general atleta mujer"
            : "Base general atleta hombre";

        const createdClient = await persistClientProfile({
          fullName,
          goal: defaultGoal,
          notes,
        });

        if (createdClient) {
          setShowAthleteOnboarding(false);
          setAthleteOnboardingForm({
            fullName: "",
            sex: "male",
            ageYears: "",
            weightKg: "",
            heightCm: "",
          });
        } else {
          throw new Error("No se pudo crear el atleta. Revisá la conexión y volvé a intentar.");
        }
      } catch (caughtError) {
        setOnboardingError(
          caughtError instanceof Error ? caughtError.message : "No se pudo crear el atleta.",
        );
      }
    });
  };

  const confirmLiveMode = () => {
    try {
      const draft = createTrainingTemplateSession(selectedTemplateId);
      draft.recoveryInputs = { ...session.recoveryInputs };

      const liveSessionId = `${selectedClientId ?? "preview"}-${Date.now().toString(36)}`;

      startLiveSession({
        sessionId: liveSessionId,
        templateId: selectedTemplateId,
        clientId: selectedClientId,
        draft,
      });

      setSession(draft);
      setShowCheckIn(false);
      setRestSeconds(0);
      setIsLaunchingLive(true);
      setHistoryError(null);

      const href = `/session/${encodeURIComponent(liveSessionId)}`;
      router.prefetch(href);
      router.push(href);
    } catch (caughtError) {
      setHistoryError(
        caughtError instanceof Error ? caughtError.message : "No se pudo preparar la rutina live.",
      );
      setIsLaunchingLive(false);
    }
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
    <div className="min-w-0 text-white">
      {showAthleteOnboarding ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 backdrop-blur sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/12 bg-[#0b1420] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            <p className="text-sm uppercase tracking-[0.24em] text-white/45">Primer atleta</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Completemos tu perfil base</h2>
            <p className="mt-3 text-sm leading-7 text-white/60">
              Para habilitar Perfil, Nutrición y Live, cargá al menos un atleta con sus métricas iniciales.
            </p>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm text-white/65">
                Nombre
                <input
                  value={athleteOnboardingForm.fullName}
                  onChange={(event) =>
                    setAthleteOnboardingForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  placeholder="Ej: Martina Alvarez"
                  className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#4cb894]"
                />
              </label>

              <div className="grid gap-2 text-sm text-white/65">
                Sexo
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAthleteOnboardingForm((current) => ({
                        ...current,
                        sex: "male",
                      }))
                    }
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      athleteOnboardingForm.sex === "male"
                        ? "border-[#4cb894]/70 bg-[#4cb894]/15 text-emerald-100"
                        : "border-white/10 bg-white/6 text-white/72 hover:bg-white/10"
                    }`}
                  >
                    Hombre
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAthleteOnboardingForm((current) => ({
                        ...current,
                        sex: "female",
                      }))
                    }
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      athleteOnboardingForm.sex === "female"
                        ? "border-[#4cb894]/70 bg-[#4cb894]/15 text-emerald-100"
                        : "border-white/10 bg-white/6 text-white/72 hover:bg-white/10"
                    }`}
                  >
                    Mujer
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-2 text-sm text-white/65">
                  Edad
                  <input
                    value={athleteOnboardingForm.ageYears}
                    inputMode="numeric"
                    onChange={(event) =>
                      setAthleteOnboardingForm((current) => ({
                        ...current,
                        ageYears: event.target.value,
                      }))
                    }
                    placeholder="28"
                    className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#4cb894]"
                  />
                </label>
                <label className="grid gap-2 text-sm text-white/65">
                  Peso (kg)
                  <input
                    value={athleteOnboardingForm.weightKg}
                    inputMode="decimal"
                    onChange={(event) =>
                      setAthleteOnboardingForm((current) => ({
                        ...current,
                        weightKg: event.target.value,
                      }))
                    }
                    placeholder="78.5"
                    className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#4cb894]"
                  />
                </label>
                <label className="grid gap-2 text-sm text-white/65">
                  Altura (cm)
                  <input
                    value={athleteOnboardingForm.heightCm}
                    inputMode="decimal"
                    onChange={(event) =>
                      setAthleteOnboardingForm((current) => ({
                        ...current,
                        heightCm: event.target.value,
                      }))
                    }
                    placeholder="176"
                    className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#4cb894]"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={createAthleteFromOnboarding}
                disabled={isCreatingClient || !onboardingCanSubmit}
                className="mt-1 inline-flex min-h-12 items-center justify-center rounded-full bg-[#4cb894] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#63c7a5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreatingClient ? "Creando atleta..." : "Guardar y continuar"}
              </button>
            </div>

            {onboardingError ? (
              <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {onboardingError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {showCheckIn ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur sm:items-center sm:p-4">
          <div className="flex max-h-[min(92svh,100%)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c1420] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="min-h-0 flex-1 overflow-y-auto p-6 pb-2">
            <p className="text-sm uppercase tracking-[0.24em] text-white/45">Check-in live</p>
            <h2 className="mt-3 text-3xl font-semibold">Elegí la rutina y ajustá el estado.</h2>
            <p className="mt-3 text-sm leading-7 text-white/60">
              {selectedClient
                ? `Vas a entrenar con ${selectedClient.fullName}. La rutina carga ejercicios y series en el modo live.`
                : "Modo preview: la rutina se carga igual. Con Supabase, las sesiones quedan atadas al atleta."}
            </p>

            <div className="mt-6">
              <p className="text-sm font-medium text-white/75">Rutina a iniciar</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {trainingTemplates.map((template) => {
                  const active = selectedTemplateId === template.id;

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`rounded-[1.35rem] border p-4 text-left transition ${
                        active
                          ? "border-[#4cb894]/50 bg-[#4cb894]/15"
                          : "border-white/10 bg-white/6 hover:bg-white/10"
                      }`}
                    >
                      <p className="font-semibold text-white">{template.name}</p>
                      <p className="mt-2 text-sm leading-6 text-white/60">{template.description}</p>
                      <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-white/45">
                        {template.entries.length} ejercicios · {template.sessionKind}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-white/45">
                También podés editar rutinas en{" "}
                <Link href="/lab/templates" className="text-[#9cf3d3] underline-offset-2 hover:underline">
                  Lab → Rutinas
                </Link>
                .
              </p>
            </div>

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
            </div>

            <div className="flex flex-col gap-3 border-t border-white/8 bg-[#0c1420] p-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCheckIn(false)}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmLiveMode}
                disabled={isLaunchingLive || !selectedTemplateId}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#4cb894] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#64c9a7] disabled:cursor-wait disabled:opacity-70"
              >
                {isLaunchingLive ? "Abriendo sesión..." : "Iniciar sesión"}
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
        <div className="flex min-h-0 flex-col bg-[#08111a] md:bg-transparent">
          <section className="border-b border-white/8 bg-[#08111a] px-4 py-4 md:hidden">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">Musculator</p>
              <h1 className="mt-1 truncate text-xl font-semibold text-white">
                {getSurfaceLabel(dashboardSurface)}
              </h1>
            </div>
          </section>

          <div className="flex-1 px-0 pb-0 pt-0 sm:px-0 sm:pb-0 sm:pt-6">
          <div className="grid min-w-0 gap-3 sm:gap-6">

          {dashboardSurface === "profile" ? (
            <div className="grid min-w-0 gap-3 sm:gap-6">
              {(saveMessage || historyError) && (
                <div
                  className={`rounded-[1.5rem] border px-4 py-3 text-sm ${
                    historyError
                      ? "border-rose-400/25 bg-rose-500/10 text-rose-100"
                      : "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                  {historyError ?? saveMessage}
                </div>
              )}
              <ProfileHero
                persistenceToneClass={connectionTone[storageMode]}
                persistenceLabel={persistenceEnabled ? "storage live" : "preview"}
                athleteInitials={selectedClient?.fullName.slice(0, 2).toUpperCase() ?? "MU"}
                athleteTitle={athleteTitle}
                goalText={
                  selectedClient
                    ? selectedClient.goal ?? "Todavía no hay un objetivo principal definido para este atleta."
                    : "Elegí Entrenar para arrancar, o entrá al Lab para editar el arsenal."
                }
                metrics={profileHeroMetrics}
              />

              <section className="grid min-w-0 gap-6">
                <article className="min-w-0 overflow-hidden rounded-[2.35rem] border border-white/8 bg-[linear-gradient(180deg,#0d1724_0%,#09111b_100%)] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.35)] sm:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm uppercase tracking-[0.24em] text-white/45">Inteligencia corporal</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                        Anatomía y radar biomecánico en una sola vista
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-7 text-white/60">
                        Cambiá entre sobrecarga muscular y distribución del estímulo para decidir ajustes de forma rápida.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/65">
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-2">
                        carga semanal {formatLoadKg(weeklyTotalLoad)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-2">
                        eje más flojo {weakestBiomechanicalAxis?.label ?? "sin dato"}
                      </span>
                      {isRefreshingAnalytics ? (
                        <span className="rounded-full border border-sky-300/35 bg-sky-300/12 px-3 py-2 text-sky-100">
                          analítica actualizando
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6 inline-flex rounded-[1rem] border border-white/10 bg-black/20 p-1">
                    <button
                      type="button"
                      onClick={() => setBodyInsightsView("anatomy")}
                      className={`rounded-[0.8rem] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                        bodyInsightsView === "anatomy"
                          ? "bg-[#4cb894] text-slate-950"
                          : "text-white/65 hover:bg-white/10"
                      }`}
                    >
                      Anatómico
                    </button>
                    <button
                      type="button"
                      onClick={() => setBodyInsightsView("biomechanics")}
                      className={`rounded-[0.8rem] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                        bodyInsightsView === "biomechanics"
                          ? "bg-[#4cb894] text-slate-950"
                          : "text-white/65 hover:bg-white/10"
                      }`}
                    >
                      Biomecánico
                    </button>
                  </div>

                  {bodyInsightsView === "anatomy" ? (
                    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                      <div>
                        <AnatomyHeatmap muscles={hasSessionHistory ? historyMuscleLoad : []} />
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-[0.18em] text-white/45">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-3 w-3 shrink-0 rounded-[4px] bg-rose-400" />
                            sobrecarga alta
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <span className="h-3 w-3 shrink-0 rounded-[4px] bg-amber-400" />
                            carga moderada
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <span className="h-3 w-3 shrink-0 rounded-[4px] bg-slate-500" />
                            recuperado
                          </span>
                        </div>
                      </div>

                      <aside className="grid gap-3 self-start">
                        {priorityRecoveryMuscles.length > 0 ? (
                          priorityRecoveryMuscles.map((muscle) => (
                            <div
                              key={muscle.muscle}
                              className={`rounded-[1.2rem] border px-4 py-3 ${muscleTone[muscle.tone]}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold">{muscle.label}</p>
                                <span className="text-xs uppercase tracking-[0.14em] opacity-80">
                                  {muscle.recoveryTimeHours}h
                                </span>
                              </div>
                              <p className="mt-1 text-xs uppercase tracking-[0.16em] opacity-65">
                                {muscle.totalSets} sets acumulados
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4 text-sm text-white/58">
                            Sin carga muscular registrada todavía para este atleta.
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={openAnatomySheet}
                          className="mt-1 inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-white/8 px-4 text-sm font-medium text-white transition hover:bg-white/12"
                        >
                          Ver detalle anatómico
                        </button>
                      </aside>
                    </div>
                  ) : (
                    <div className="mt-6 grid min-w-0 gap-4">
                      <BiomechanicalRadar axes={biomechanicalAxes} />
                      <div className="flex flex-col gap-3 rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
                        <span>Plan de referencia: {referencePlanLabel}</span>
                        <button
                          type="button"
                          onClick={openRadarSheet}
                          className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 bg-white/8 px-4 text-sm font-medium text-white transition hover:bg-white/12"
                        >
                          Ver detalle biomecánico
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              </section>

              <ProfileDecisionRow
                readinessScore={profileReadiness.score}
                readinessLabel={readinessLabel}
                readinessToneClass={readinessToneClass}
                readinessRingColor={readinessRingColor}
                readinessRingSoft={readinessRingSoft}
                readinessCentralPenalty={formatRounded(profileReadiness.centralPenalty)}
                showCriticalAlert={showCriticalAlert}
                weeklyNeuralCost={weeklyNeuralCost}
                weeklyNeuralTarget={weeklyNeuralTarget}
                weeklyNeuralDelta={weeklyNeuralDelta}
                recoveryGapHours={recoveryGapHours}
                weeklyNeuralProgressPercent={weeklyNeuralProgressPercent}
                weeklyNeuralProgressBarPercent={weeklyNeuralProgressBarPercent}
                weeklyNeuralOverflowPercent={weeklyNeuralOverflowPercent}
                nutritionSupportRatio={nutritionSupportRatio.toFixed(2)}
                nutritionRecoveryGapPercent={Math.round(nutritionRecoveryGap * 100)}
                nextActionSuggestion={nextActionSuggestion}
                sessionTitle={session.title}
                referencePlanLabel={referencePlanLabel}
                onOpenReadiness={openReadinessSheet}
                onOpenMetabolic={openMetabolicSheet}
                onOpenNextAction={openNextActionSheet}
              />

              <section className="grid min-w-0 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <article className="min-w-0 overflow-hidden rounded-[2.35rem] border border-white/8 bg-[#09111b] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.35)] sm:p-6">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/45">Insights operativos</p>
                  <div className="mt-4 grid gap-3 text-sm leading-7 text-white/76">
                    {analysis.recommendations.length > 0 ? (
                      analysis.recommendations.map((recommendation) => (
                        <div
                          key={recommendation}
                          className="break-words rounded-[1.3rem] border border-white/10 bg-white/6 px-4 py-3.5"
                        >
                          {recommendation}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.3rem] border border-white/10 bg-white/6 px-4 py-3.5">
                        Sin recomendaciones calculadas para este ciclo todavía.
                      </div>
                    )}
                  </div>
                  <div className="mt-5 grid gap-3">
                    <div className="min-w-0 rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Bloque actual</p>
                      <p className="mt-2 break-words text-lg font-semibold text-white">{session.title}</p>
                    </div>
                    <div className="min-w-0 rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Últimos títulos</p>
                      <p className="mt-2 break-words text-sm leading-6 text-white/65">
                        {recentTitles.length > 0 ? recentTitles.join(" · ") : "Sin historial todavía."}
                      </p>
                    </div>
                  </div>
                </article>

                <article className="min-w-0 overflow-hidden rounded-[2.35rem] border border-white/8 bg-[#09111b] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.35)] sm:p-6">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/45">Músculos foco</p>
                  <div className="mt-4 rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                    <div className="flex flex-wrap gap-2">
                      {focusMuscles.length > 0 ? (
                        focusMuscles.map(([muscleSlug, muscle]) => (
                          <span
                            key={muscleSlug}
                            className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/62"
                          >
                            {muscle.muscleName} · {muscle.totalSets} sets
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-white/52">
                          Todavía no hay carga histórica consolidada.
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              </section>

              <section className="grid min-w-0 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <article
                  onClick={openConsistencySheet}
                  className="min-w-0 cursor-pointer overflow-hidden rounded-[2.35rem] border border-white/8 bg-[#09111b] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.35)] transition hover:-translate-y-0.5 hover:border-[#4cb894]/30 sm:p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm uppercase tracking-[0.24em] text-white/45">Mapa de calor de consistencia</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                        Tendencia de entrenamiento semanal
                      </h2>
                    </div>
                    <div className="shrink-0 rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Días activos últimos 7</p>
                      <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{recentActiveDays}</p>
                    </div>
                  </div>

                  <div className="mt-6 overflow-x-auto pb-2">
                    <div className="inline-grid min-w-[560px] grid-flow-col grid-rows-7 gap-1.5 sm:min-w-[640px] sm:gap-2">
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

                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-[0.18em] text-white/45">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-[4px] border border-emerald-400/20 bg-emerald-500/70" />
                      musculación
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-[4px] border border-orange-400/20 bg-orange-500/70" />
                      acondicionamiento
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-[4px] border border-sky-400/20 bg-sky-500/70" />
                      mixto
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-[4px] border border-white/10 bg-white/8" />
                      descanso
                    </span>
                  </div>
                </article>

                <article className="min-w-0 overflow-hidden rounded-[2.35rem] border border-white/8 bg-[#0d1724] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.28)] sm:p-6">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/45">Balance de vectores</p>
                  <div className="mt-4 grid gap-3">
                    {profileStimulusBalance.length > 0 ? (
                      profileStimulusBalance.map((slice) => (
                        <div
                          key={slice.stimulusVector}
                          className="min-w-0 rounded-[1.3rem] border border-white/10 bg-white/6 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-white">{stimulusLabel[slice.stimulusVector]}</p>
                            <span className="text-sm tabular-nums text-white/55">
                              {slice.totalSets} sets · objetivo {slice.targetSets.toFixed(1)}
                            </span>
                          </div>
                          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/8">
                            <div
                              className="h-full rounded-full bg-[#4cb894]"
                              style={{
                                width: `${Math.max((slice.totalSets / Math.max(slice.targetSets, 1)) * 100, 8)}%`,
                              }}
                            />
                          </div>
                          <p className="mt-2 text-sm text-white/52">
                            {formatLoadKg(slice.totalLoadKg)} de volumen acumulado.
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="min-w-0 rounded-[1.3rem] border border-white/10 bg-white/6 p-4 text-sm text-white/58">
                        Sin sesiones guardadas todavía para construir el balance de vectores.
                      </div>
                    )}
                  </div>
                </article>
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
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${isConditioningSession(sessionSummary.title) ? "border-orange-400/25 bg-orange-500/10 text-orange-200" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"}`}>
                                  {isConditioningSession(sessionSummary.title) ? "condicion" : "fuerza"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => deletePersistedSession(sessionSummary.sessionId)}
                                  disabled={
                                    isDeletingSession && deletingSessionId === sessionSummary.sessionId
                                  }
                                  className="inline-flex h-8 items-center justify-center rounded-full border border-rose-300/35 bg-rose-500/10 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isDeletingSession && deletingSessionId === sessionSummary.sessionId
                                    ? "Eliminando..."
                                    : "Eliminar"}
                                </button>
                              </div>
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
            </div>
          ) : dashboardSurface === "nutrition" ? (
            <NutritionWorkspace
              clientId={selectedClientId}
              clientName={selectedClient?.fullName ?? null}
              clientGoal={selectedClient?.goal}
              weightKg={weightKgForPlanning}
              persistenceEnabled={persistenceEnabled}
              supportRatio={nutritionSupportRatio}
              targetSupportRatio={targetSupportRatio}
              recoveryGapPercent={Math.round(nutritionRecoveryGap * 100)}
              recommendations={analysis.recommendations}
            />
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
                      onClick={() => openProfileForClient(client.id)}
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
                    Fecha y hora de la sesion
                    <input
                      type="datetime-local"
                      max={toLocalDateTimeInputValue(new Date().toISOString())}
                      value={toLocalDateTimeInputValue(session.startedAt)}
                      onChange={(event) => {
                        const rawValue = event.target.value;

                        updateSession((current) => ({
                          ...current,
                          startedAt: rawValue ? (toIsoFromLocalDateTimeInput(rawValue) ?? current.startedAt) : undefined,
                        }));
                      }}
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
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/58">
                            {savedSession.totalSets} sets · {Math.round(savedSession.totalLoadKg)} kg
                          </span>
                          <button
                            type="button"
                            onClick={() => deletePersistedSession(savedSession.sessionId)}
                            disabled={isDeletingSession && deletingSessionId === savedSession.sessionId}
                            className="inline-flex h-8 items-center justify-center rounded-full border border-rose-300/35 bg-rose-500/10 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeletingSession && deletingSessionId === savedSession.sessionId
                              ? "Eliminando..."
                              : "Eliminar"}
                          </button>
                        </div>
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

          </div>
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