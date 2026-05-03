import {
  clientProfileAnalyticsResponseSchema,
  trainingHistoryResponseSchema,
  trainingSessionSaveResponseSchema,
  type BiomechanicalRadarAxis,
  type MovementPattern,
  type PersistedTrainingSessionSummary,
  type ReadinessBreakdown,
  type StimulusVector,
  type TrainingSessionDraft,
  type ClientProfileAnalyticsResponse,
  type TrainingHistoryResponse,
  type TrainingSessionSaveResponse,
} from "@musculator/contracts";
import { analyzeTrainingSession } from "@musculator/domain";
import { createAdminSupabaseClient, getTrainingPersistenceContext } from "../platform/supabase-admin";

interface InsertedSessionRow {
  id: string;
  started_at: string;
}

interface InsertedEntryRow {
  id: string;
  sequence_index: number;
}

interface SessionSummaryViewRow {
  session_id: string;
  started_at: string;
  total_sets: number;
  total_load_kg: number | string | null;
  peak_rpe: number | null;
  average_rpe: number | string | null;
}

interface SessionSummaryViewRowWithTitle extends SessionSummaryViewRow {
  title: string;
}

interface MuscleLoadViewRow {
  session_id: string;
  muscle_slug: string;
  muscle_name: string;
  total_sets: number;
  total_load_kg: number | string | null;
}

interface WorkoutSessionMetadataRow {
  id: string;
  notes: string | null;
  started_at: string;
}

interface ClientOwnershipRow {
  id: string;
}

interface SessionAnalyticsRow {
  id: string;
  started_at: string;
  title: string;
  notes: string | null;
}

interface EntryAnalyticsRow {
  id: string;
  session_id: string;
  exercise_id: string | null;
}

interface SetAnalyticsRow {
  entry_id: string;
  reps: number | null;
  weight_kg: number | string | null;
}

interface ExerciseAnalyticsRow {
  id: string;
  stimulus_vector: StimulusVector;
  movement_pattern: MovementPattern;
  cns_tax_multiplier: number | string;
}

interface RecoveryAnalyticsRow {
  session_id: string;
  recovery_time_dynamic_hours: number;
}

interface ProtocolAssignmentRow {
  protocol_id: string;
  active_week: number;
}

interface ProtocolRow {
  id: string;
  name: string;
}

interface ProtocolWeekRow {
  id: string;
  load_factor: number;
}

interface ProtocolWeekTemplateRow {
  template_id: string;
  progression_percent: number;
}

interface TemplateNameRow {
  id: string;
  name: string;
}

interface TemplateEntryAnalyticsRow {
  exercise_id: string | null;
  target_sets: number;
  target_stimulus_vector: StimulusVector | null;
}

const legacyTitlePrefix = "[musculator-title]";
const sessionMetaPrefix = "[musculator-meta]";
const stimulusVectorOrder: StimulusVector[] = [
  "amplitud",
  "densidad",
  "fuerza",
  "cardio_metabolico",
  "acondicionamiento",
  "potencia",
];

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toIsoDateTime(value: string) {
  const normalized = new Date(value);

  if (Number.isNaN(normalized.getTime())) {
    return value;
  }

  return normalized.toISOString();
}

function getDateKey(value: string) {
  const date = new Date(value);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function getWeekKey(value: string) {
  const date = new Date(value);
  const utcDate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.floor((utcDate - startOfYear) / (7 * 24 * 60 * 60 * 1000));

  return `${date.getUTCFullYear()}-${week}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sumMapValues<T>(map: Map<T, number>) {
  return [...map.values()].reduce((sum, value) => sum + value, 0);
}

function blendTargetMap<T>(
  plannedMap: Map<T, number>,
  actualMap: Map<T, number>,
  options: { minimumPlanVolume: number; maxBlendWeight: number },
) {
  const plannedVolume = sumMapValues(plannedMap);
  const actualVolume = sumMapValues(actualMap);

  if (plannedVolume >= options.minimumPlanVolume || actualVolume <= 0) {
    return new Map(plannedMap);
  }

  const deficitRatio = clamp(
    (options.minimumPlanVolume - plannedVolume) / options.minimumPlanVolume,
    0,
    1,
  );
  const blendWeight = options.maxBlendWeight * deficitRatio;
  const blended = new Map(plannedMap);

  for (const [key, value] of actualMap.entries()) {
    blended.set(key, (blended.get(key) ?? 0) + value * blendWeight);
  }

  return blended;
}

function calibrateWeeklyNeuralTarget(input: {
  plannedTarget: number;
  weeklyNeuralCost: number;
  totalNeuralCost28: number;
  observedWeeks: number;
}) {
  const observedWeeks = Math.max(input.observedWeeks, 1);
  const historicalWeekly =
    input.totalNeuralCost28 > 0
      ? input.totalNeuralCost28 / observedWeeks
      : input.weeklyNeuralCost;
  const floor = Math.max(28, historicalWeekly * 0.85, input.weeklyNeuralCost * 0.62);
  const ceiling = Math.max(floor, historicalWeekly * 1.25, input.weeklyNeuralCost * 1.2);

  const target =
    input.plannedTarget > 0
      ? clamp(input.plannedTarget, floor, ceiling)
      : clamp(historicalWeekly, floor, ceiling);

  return {
    calibratedTarget: Number(target.toFixed(1)),
    historicalWeekly: Number(historicalWeekly.toFixed(1)),
  };
}

async function getExerciseIdMap(slugs: string[]) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("exercises")
    .select("id, slug")
    .in("slug", Array.from(new Set(slugs)));

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((exercise) => [exercise.slug, exercise.id]));
}

function sortTopMuscles(muscles: MuscleLoadViewRow[]) {
  return [...muscles]
    .sort((left, right) => toNumber(right.total_load_kg) - toNumber(left.total_load_kg))
    .slice(0, 3)
    .map((muscle) => ({
      muscleSlug: muscle.muscle_slug,
      muscleName: muscle.muscle_name,
      totalSets: muscle.total_sets,
      totalLoadKg: toNumber(muscle.total_load_kg),
    }));
}

function isMissingTitleError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("title") &&
    (normalized.includes("does not exist") ||
      normalized.includes("could not find") ||
      normalized.includes("schema cache"))
  );
}

function encodeLegacyNotes(title: string, notes?: string) {
  const base = `${legacyTitlePrefix}${title}`;

  return notes ? `${base}\n${notes}` : base;
}

function decodeLegacyTitle(notes: string | null, startedAt: string) {
  if (notes?.startsWith(legacyTitlePrefix)) {
    const [firstLine] = notes.split("\n");

    return firstLine?.replace(legacyTitlePrefix, "").trim() || "Sesion";
  }

  if (notes && notes.length <= 48) {
    return notes;
  }

  const date = new Date(startedAt);

  if (Number.isNaN(date.getTime())) {
    return "Sesion";
  }

  return `Sesion ${date.toLocaleDateString("es-AR")}`;
}

function appendSessionMeta(
  notes: string | undefined,
  recoveryInputs: {
    sleepHours: number;
    carbsTargetRatio: number;
    hydrationTargetRatio: number;
  },
) {
  const trimmedNotes = notes?.trim() ?? "";
  const withoutMeta = trimmedNotes
    .split("\n")
    .filter((line) => !line.startsWith(sessionMetaPrefix))
    .join("\n")
    .trim();
  const metaLine = `${sessionMetaPrefix}sleep=${recoveryInputs.sleepHours.toFixed(1)};carbs=${recoveryInputs.carbsTargetRatio.toFixed(2)};hydration=${recoveryInputs.hydrationTargetRatio.toFixed(2)}`;

  return withoutMeta ? `${withoutMeta}\n${metaLine}` : metaLine;
}

function parseSessionMeta(notes: string | null) {
  if (!notes) {
    return null;
  }

  const metaLine = notes
    .split("\n")
    .find((line) => line.startsWith(sessionMetaPrefix));

  if (!metaLine) {
    return null;
  }

  const payload = metaLine.replace(sessionMetaPrefix, "");
  const values = payload.split(";").reduce((accumulator, part) => {
    const [rawKey, rawValue] = part.split("=");
    const key = rawKey?.trim();
    const parsedValue = Number(rawValue);

    if (key && Number.isFinite(parsedValue)) {
      accumulator.set(key, parsedValue);
    }

    return accumulator;
  }, new Map<string, number>());

  const sleepHours = values.get("sleep");
  const carbsTargetRatio = values.get("carbs");
  const hydrationTargetRatio = values.get("hydration");

  if (
    sleepHours === undefined ||
    carbsTargetRatio === undefined ||
    hydrationTargetRatio === undefined
  ) {
    return null;
  }

  return {
    sleepHours,
    carbsTargetRatio,
    hydrationTargetRatio,
  };
}

function axisFromPattern(patternTotals: Map<MovementPattern, number>) {
  const verticalPull = patternTotals.get("vertical_pull") ?? 0;
  const horizontalPull = patternTotals.get("horizontal_pull") ?? 0;
  const push =
    (patternTotals.get("horizontal_push") ?? 0) +
    (patternTotals.get("vertical_push") ?? 0) +
    (patternTotals.get("isolation") ?? 0) * 0.35;
  const posteriorChain =
    (patternTotals.get("hip_hinge") ?? 0) +
    (patternTotals.get("knee_dominant") ?? 0) +
    (patternTotals.get("core_anti_movement") ?? 0) * 0.5;
  const conditioning =
    (patternTotals.get("locomotion_metabolic") ?? 0) +
    (patternTotals.get("rotation_ballistic") ?? 0) * 0.45;

  return {
    verticalPull,
    horizontalPull,
    push,
    posteriorChain,
    conditioning,
  };
}

function toRadarAxes(
  actualPatternTotals: Map<MovementPattern, number>,
  targetPatternTotals: Map<MovementPattern, number>,
): BiomechanicalRadarAxis[] {
  const actualAxis = axisFromPattern(actualPatternTotals);
  const targetAxis = axisFromPattern(targetPatternTotals);

  const maxActual = Math.max(...Object.values(actualAxis), 1);
  const maxTarget = Math.max(...Object.values(targetAxis), 1);
  const gapPercent = (actual: number, target: number) => {
    const denominator = Math.max(target, maxTarget * 0.45, 1);

    return clamp(Math.round(((actual - target) / denominator) * 100), -100, 100);
  };

  return [
    {
      key: "verticalPull",
      label: "Traccion vertical",
      actualPercent: Math.round((actualAxis.verticalPull / maxActual) * 100),
      targetPercent: Math.round((targetAxis.verticalPull / maxTarget) * 100),
      gapPercent: gapPercent(actualAxis.verticalPull, targetAxis.verticalPull),
    },
    {
      key: "horizontalPull",
      label: "Traccion horizontal",
      actualPercent: Math.round((actualAxis.horizontalPull / maxActual) * 100),
      targetPercent: Math.round((targetAxis.horizontalPull / maxTarget) * 100),
      gapPercent: gapPercent(actualAxis.horizontalPull, targetAxis.horizontalPull),
    },
    {
      key: "push",
      label: "Empuje",
      actualPercent: Math.round((actualAxis.push / maxActual) * 100),
      targetPercent: Math.round((targetAxis.push / maxTarget) * 100),
      gapPercent: gapPercent(actualAxis.push, targetAxis.push),
    },
    {
      key: "posteriorChain",
      label: "Cadena posterior",
      actualPercent: Math.round((actualAxis.posteriorChain / maxActual) * 100),
      targetPercent: Math.round((targetAxis.posteriorChain / maxTarget) * 100),
      gapPercent: gapPercent(actualAxis.posteriorChain, targetAxis.posteriorChain),
    },
    {
      key: "conditioning",
      label: "Acondicionamiento",
      actualPercent: Math.round((actualAxis.conditioning / maxActual) * 100),
      targetPercent: Math.round((targetAxis.conditioning / maxTarget) * 100),
      gapPercent: gapPercent(actualAxis.conditioning, targetAxis.conditioning),
    },
  ];
}

function computeReadinessFromTelemetry(input: {
  weeklyNeuralCost: number;
  weeklyNeuralTarget: number;
  recoveryGapHours: number;
  nutritionRecoveryGap: number;
  activeDays: number;
  weeklySessionCount: number;
  observedWeeks: number;
}): ReadinessBreakdown {
  const coverageFactor = clamp(
    0.45 + Math.min(input.observedWeeks, 4) * 0.1 + Math.min(input.weeklySessionCount, 5) * 0.06,
    0.45,
    1,
  );
  const overloadRatio =
    input.weeklyNeuralTarget > 0
      ? clamp(input.weeklyNeuralCost / input.weeklyNeuralTarget, 0.35, 1.9)
      : input.weeklyNeuralCost > 0
        ? 1.2
        : 1;
  const centralPenalty =
    Math.max(0, (overloadRatio - 1) * 28) * coverageFactor +
    Math.min(input.recoveryGapHours, 72) * 0.08;
  const localPenalty =
    Math.min(input.recoveryGapHours, 72) * 0.11 + input.nutritionRecoveryGap * 24;
  const recoveryBonus =
    Math.min(input.activeDays * 2.6, 12) + (input.nutritionRecoveryGap < 0.08 ? 2 : 0);
  const score = clamp(Math.round(76 - centralPenalty - localPenalty + recoveryBonus), 15, 98);
  const status: ReadinessBreakdown["status"] = score >= 70 ? "green" : score >= 45 ? "amber" : "red";

  return {
    score,
    status,
    centralPenalty: Number(centralPenalty.toFixed(1)),
    localPenalty: Number(localPenalty.toFixed(1)),
    recoveryBonus: Number(recoveryBonus.toFixed(1)),
  };
}

export async function saveTrainingSession(
  session: TrainingSessionDraft,
  clientId?: string,
): Promise<TrainingSessionSaveResponse> {
  const analysis = analyzeTrainingSession(session);
  const context = await getTrainingPersistenceContext();

  if (!context.configured || !context.userId) {
    return trainingSessionSaveResponseSchema.parse({
      status: "preview",
      storage: "noop",
      analysis,
    });
  }

  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const notesWithMeta = appendSessionMeta(session.notes, session.recoveryInputs);

  if (!clientId) {
    throw new Error("Primero crea o selecciona un cliente.");
  }

  const { data: ownedClient, error: clientError } = (await admin
    .from("clients")
    .select("id")
    .eq("owner_user_id", context.userId)
    .eq("id", clientId)
    .single()) as {
    data: ClientOwnershipRow | null;
    error: { message: string } | null;
  };

  if (clientError || !ownedClient) {
    throw new Error(clientError?.message ?? "El cliente seleccionado no existe.");
  }

  let insertedSession: InsertedSessionRow | null = null;
  let sessionError: { message: string } | null = null;

  const withTitleResult = (await admin
    .from("workout_sessions")
    .insert({
      user_id: context.userId,
      client_id: clientId,
      source: "manual",
      title: session.title,
      notes: notesWithMeta,
      started_at: now,
      ended_at: now,
    })
    .select("id, started_at")
    .single()) as { data: InsertedSessionRow | null; error: { message: string } | null };

  insertedSession = withTitleResult.data;
  sessionError = withTitleResult.error;

  if (sessionError && isMissingTitleError(sessionError.message)) {
    const fallbackResult = (await admin
      .from("workout_sessions")
      .insert({
        user_id: context.userId,
        client_id: clientId,
        source: "manual",
        notes: encodeLegacyNotes(session.title, notesWithMeta),
        started_at: now,
        ended_at: now,
      })
      .select("id, started_at")
      .single()) as { data: InsertedSessionRow | null; error: { message: string } | null };

    insertedSession = fallbackResult.data;
    sessionError = fallbackResult.error;
  }

  if (sessionError || !insertedSession) {
    throw new Error(sessionError?.message ?? "No se pudo guardar la sesion.");
  }

  const exerciseIdMap = await getExerciseIdMap(session.entries.map((entry) => entry.slug));

  const { data: insertedEntries, error: entriesError } = (await admin
    .from("workout_entries")
    .insert(
      session.entries.map((entry, index) => ({
        session_id: insertedSession.id,
        exercise_id: exerciseIdMap.get(entry.slug) ?? null,
        raw_exercise_name: exerciseIdMap.get(entry.slug) ? null : entry.name,
        source: "manual",
        sequence_index: index,
        notes: entry.notes ?? null,
      })),
    )
    .select("id, sequence_index")) as {
    data: InsertedEntryRow[] | null;
    error: { message: string } | null;
  };

  if (entriesError || !insertedEntries) {
    throw new Error(entriesError?.message ?? "No se pudieron guardar los ejercicios.");
  }

  const entryIdBySequence = new Map(
    insertedEntries.map((entry) => [entry.sequence_index, entry.id]),
  );

  const workoutSets = session.entries.flatMap((entry, entryIndex) => {
    const entryId = entryIdBySequence.get(entryIndex);

    if (!entryId) {
      return [];
    }

    return entry.sets.map((set, setIndex) => ({
      entry_id: entryId,
      set_index: setIndex + 1,
      reps: set.reps ?? null,
      weight_kg: set.weightKg ?? null,
      duration_seconds: set.durationMinutes ? Math.round(set.durationMinutes * 60) : null,
      rpe: set.rpe ?? null,
    }));
  });

  if (workoutSets.length > 0) {
    const { error: setsError } = await admin.from("workout_sets").insert(workoutSets);

    if (setsError) {
      throw new Error(setsError.message);
    }
  }

  return trainingSessionSaveResponseSchema.parse({
    status: "saved",
    storage: "supabase",
    sessionId: insertedSession.id,
    savedAt: toIsoDateTime(insertedSession.started_at),
    analysis,
  });
}

export async function listTrainingSessions(
  limit = 8,
  clientId?: string,
): Promise<TrainingHistoryResponse> {
  const context = await getTrainingPersistenceContext();

  if (!context.configured || !context.userId) {
    return trainingHistoryResponseSchema.parse({
      status: "preview",
      storage: "noop",
      sessions: [],
    });
  }

  const admin = createAdminSupabaseClient();

  if (!clientId) {
    return trainingHistoryResponseSchema.parse({
      status: "connected",
      storage: context.storage,
      sessions: [],
    });
  }

  const { data: clientSessions, error: clientSessionsError } = (await admin
    .from("workout_sessions")
    .select("id")
    .eq("user_id", context.userId)
    .eq("client_id", clientId)
    .order("started_at", { ascending: false })
    .limit(limit)) as {
    data: Array<{ id: string }> | null;
    error: { message: string } | null;
  };

  if (clientSessionsError) {
    throw new Error(clientSessionsError.message);
  }

  const allowedSessionIds = (clientSessions ?? []).map((row) => row.id);

  if (allowedSessionIds.length === 0) {
    return trainingHistoryResponseSchema.parse({
      status: "connected",
      storage: context.storage,
      sessions: [],
    });
  }

  let summaryRows: SessionSummaryViewRow[] = [];
  let sessionTitles = new Map<string, string>();

  const summaryWithTitleResult = (await admin
    .from("v_workout_session_summary")
    .select("session_id, title, started_at, total_sets, total_load_kg, peak_rpe, average_rpe")
    .in("session_id", allowedSessionIds)
    .order("started_at", { ascending: false })
    .limit(limit)) as {
    data: SessionSummaryViewRowWithTitle[] | null;
    error: { message: string } | null;
  };

  if (summaryWithTitleResult.error && !isMissingTitleError(summaryWithTitleResult.error.message)) {
    throw new Error(summaryWithTitleResult.error.message);
  }

  if (summaryWithTitleResult.data) {
    summaryRows = summaryWithTitleResult.data;
    sessionTitles = new Map(summaryWithTitleResult.data.map((row) => [row.session_id, row.title]));
  } else {
    const legacySummaryResult = (await admin
      .from("v_workout_session_summary")
      .select("session_id, started_at, total_sets, total_load_kg, peak_rpe, average_rpe")
      .in("session_id", allowedSessionIds)
      .order("started_at", { ascending: false })
      .limit(limit)) as {
      data: SessionSummaryViewRow[] | null;
      error: { message: string } | null;
    };

    if (legacySummaryResult.error) {
      throw new Error(legacySummaryResult.error.message);
    }

    summaryRows = legacySummaryResult.data ?? [];
    const sessionMetadataResult = (await admin
      .from("workout_sessions")
      .select("id, notes, started_at")
      .in("id", allowedSessionIds)
      .order("started_at", { ascending: false })
      .limit(limit)) as {
      data: WorkoutSessionMetadataRow[] | null;
      error: { message: string } | null;
    };

    if (sessionMetadataResult.error) {
      throw new Error(sessionMetadataResult.error.message);
    }

    sessionTitles = new Map(
      (sessionMetadataResult.data ?? []).map((row) => [row.id, decodeLegacyTitle(row.notes, row.started_at)]),
    );
  }

  const sessionIds = summaryRows.map((row) => row.session_id);
  let muscleRows: MuscleLoadViewRow[] = [];

  if (sessionIds.length > 0) {
    const { data, error } = (await admin
      .from("v_workout_muscle_load")
      .select("session_id, muscle_slug, muscle_name, total_sets, total_load_kg")
      .in("session_id", sessionIds)) as {
      data: MuscleLoadViewRow[] | null;
      error: { message: string } | null;
    };

    if (error) {
      throw new Error(error.message);
    }

    muscleRows = data ?? [];
  }

  const musclesBySession = new Map<string, MuscleLoadViewRow[]>();

  muscleRows.forEach((muscleRow) => {
    const current = musclesBySession.get(muscleRow.session_id) ?? [];
    current.push(muscleRow);
    musclesBySession.set(muscleRow.session_id, current);
  });

  const sessions: PersistedTrainingSessionSummary[] = summaryRows.map((row) => ({
    sessionId: row.session_id,
    title: sessionTitles.get(row.session_id) ?? "Sesion",
    startedAt: toIsoDateTime(row.started_at),
    totalSets: row.total_sets,
    totalLoadKg: toNumber(row.total_load_kg),
    peakRpe: row.peak_rpe ?? 0,
    averageRpe: toNumber(row.average_rpe),
    topMuscles: sortTopMuscles(musclesBySession.get(row.session_id) ?? []),
  }));

  return trainingHistoryResponseSchema.parse({
    status: "connected",
    storage: "supabase",
    sessions,
  });
}

function createEmptyPatternMap() {
  return new Map<MovementPattern, number>([
    ["horizontal_push", 0],
    ["vertical_push", 0],
    ["horizontal_pull", 0],
    ["vertical_pull", 0],
    ["knee_dominant", 0],
    ["hip_hinge", 0],
    ["isolation", 0],
    ["core_anti_movement", 0],
    ["rotation_ballistic", 0],
    ["locomotion_metabolic", 0],
  ]);
}

function createEmptyStimulusMap() {
  return new Map<StimulusVector, number>(stimulusVectorOrder.map((vector) => [vector, 0]));
}

function createEmptyAnalytics(clientId: string): ClientProfileAnalyticsResponse {
  return clientProfileAnalyticsResponseSchema.parse({
    status: "connected",
    storage: "supabase",
    analytics: {
      clientId,
      readiness: {
        score: 62,
        status: "amber",
        centralPenalty: 12,
        localPenalty: 10,
        recoveryBonus: 2,
      },
      weeklyNeuralCost: 0,
      weeklyNeuralTarget: 0,
      weeklyNeuralDelta: 0,
      recoveryGapHours: 0,
      nutritionRecoveryGap: 0,
      nutritionSupportRatio: 1,
      targetSupportRatio: 1,
      radarAxes: [
        { key: "verticalPull", label: "Traccion vertical", actualPercent: 0, targetPercent: 0, gapPercent: 0 },
        { key: "horizontalPull", label: "Traccion horizontal", actualPercent: 0, targetPercent: 0, gapPercent: 0 },
        { key: "push", label: "Empuje", actualPercent: 0, targetPercent: 0, gapPercent: 0 },
        { key: "posteriorChain", label: "Cadena posterior", actualPercent: 0, targetPercent: 0, gapPercent: 0 },
        { key: "conditioning", label: "Acondicionamiento", actualPercent: 0, targetPercent: 0, gapPercent: 0 },
      ],
      stimulusBalance: stimulusVectorOrder.map((stimulusVector) => ({
        stimulusVector,
        actualSets: 0,
        targetSets: 0,
        actualLoadKg: 0,
      })),
    },
  });
}

async function resolvePlanTargets(userId: string, clientId: string) {
  const admin = createAdminSupabaseClient();
  const targetPattern = createEmptyPatternMap();
  const targetStimulus = createEmptyStimulusMap();
  let weeklyNeuralTarget = 0;
  let referenceTemplateName: string | undefined;
  let referenceProtocolName: string | undefined;

  const { data: assignment } = (await admin
    .from("client_protocol_assignments")
    .select("protocol_id, active_week")
    .eq("client_id", clientId)
    .in("status", ["active", "draft"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as {
    data: ProtocolAssignmentRow | null;
    error: { message: string } | null;
  };

  let templateIds: string[] = [];
  let progressionByTemplate = new Map<string, number>();
  let loadFactor = 1;

  if (assignment) {
    const { data: protocol } = (await admin
      .from("training_protocols")
      .select("id, name")
      .eq("id", assignment.protocol_id)
      .maybeSingle()) as {
      data: ProtocolRow | null;
      error: { message: string } | null;
    };

    if (protocol) {
      referenceProtocolName = protocol.name;
    }

    const { data: week } = (await admin
      .from("training_protocol_weeks")
      .select("id, load_factor")
      .eq("protocol_id", assignment.protocol_id)
      .eq("week_number", assignment.active_week)
      .maybeSingle()) as {
      data: ProtocolWeekRow | null;
      error: { message: string } | null;
    };

    if (week) {
      loadFactor = week.load_factor;
      const { data: weekTemplates } = (await admin
        .from("training_protocol_week_templates")
        .select("template_id, progression_percent")
        .eq("protocol_week_id", week.id)
        .order("order_index", { ascending: true })) as {
        data: ProtocolWeekTemplateRow[] | null;
        error: { message: string } | null;
      };

      templateIds = (weekTemplates ?? []).map((item) => item.template_id);
      progressionByTemplate = new Map(
        (weekTemplates ?? []).map((item) => [item.template_id, item.progression_percent]),
      );
    }
  }

  if (templateIds.length === 0) {
    const { data: template } = (await admin
      .from("training_templates")
      .select("id, name")
      .or(`owner_user_id.eq.${userId},is_system.eq.true`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()) as {
      data: TemplateNameRow | null;
      error: { message: string } | null;
    };

    if (template) {
      templateIds = [template.id];
      referenceTemplateName = template.name;
      progressionByTemplate = new Map([[template.id, 0]]);
    }
  } else {
    const { data: templateNames } = (await admin
      .from("training_templates")
      .select("id, name")
      .in("id", templateIds)) as {
      data: TemplateNameRow[] | null;
      error: { message: string } | null;
    };

    referenceTemplateName = (templateNames ?? []).map((item) => item.name).slice(0, 2).join(" + ") || undefined;
  }

  if (templateIds.length === 0) {
    return {
      targetPattern,
      targetStimulus,
      weeklyNeuralTarget,
      referenceTemplateName,
      referenceProtocolName,
    };
  }

  const { data: entries } = (await admin
    .from("training_template_entries")
    .select("template_id, exercise_id, target_sets, target_stimulus_vector")
    .in("template_id", templateIds)) as {
    data: Array<TemplateEntryAnalyticsRow & { template_id: string }> | null;
    error: { message: string } | null;
  };

  const exerciseIds = Array.from(
    new Set((entries ?? []).map((entry) => entry.exercise_id).filter((value): value is string => Boolean(value))),
  );

  const exerciseById = new Map<string, ExerciseAnalyticsRow>();

  if (exerciseIds.length > 0) {
    const { data: exercises } = (await admin
      .from("exercises")
      .select("id, stimulus_vector, movement_pattern, cns_tax_multiplier")
      .in("id", exerciseIds)) as {
      data: ExerciseAnalyticsRow[] | null;
      error: { message: string } | null;
    };

    for (const exercise of exercises ?? []) {
      exerciseById.set(exercise.id, exercise);
    }
  }

  for (const entry of entries ?? []) {
    const exercise = entry.exercise_id ? exerciseById.get(entry.exercise_id) : undefined;
    const progressionPercent = progressionByTemplate.get(entry.template_id) ?? 0;
    const progressionFactor = 1 + progressionPercent / 100;
    const adjustedSets = Math.max(entry.target_sets * loadFactor * progressionFactor, 0);
    const vector = entry.target_stimulus_vector ?? exercise?.stimulus_vector ?? null;

    if (vector) {
      targetStimulus.set(vector, (targetStimulus.get(vector) ?? 0) + adjustedSets);
    }

    if (exercise) {
      targetPattern.set(
        exercise.movement_pattern,
        (targetPattern.get(exercise.movement_pattern) ?? 0) + adjustedSets,
      );
      weeklyNeuralTarget += adjustedSets * (toNumber(exercise.cns_tax_multiplier) || 0);
    }
  }

  return {
    targetPattern,
    targetStimulus,
    weeklyNeuralTarget: Number(weeklyNeuralTarget.toFixed(1)),
    referenceTemplateName,
    referenceProtocolName,
  };
}

export async function getClientProfileAnalytics(
  clientId: string,
): Promise<ClientProfileAnalyticsResponse> {
  const context = await getTrainingPersistenceContext();

  if (!context.configured || !context.userId) {
    return clientProfileAnalyticsResponseSchema.parse({
      status: "preview",
      storage: "noop",
      analytics: {
        ...createEmptyAnalytics(clientId).analytics,
        clientId,
      },
    });
  }

  const admin = createAdminSupabaseClient();
  const { data: ownedClient, error: clientError } = (await admin
    .from("clients")
    .select("id")
    .eq("owner_user_id", context.userId)
    .eq("id", clientId)
    .single()) as {
    data: ClientOwnershipRow | null;
    error: { message: string } | null;
  };

  if (clientError || !ownedClient) {
    throw new Error(clientError?.message ?? "El cliente seleccionado no existe.");
  }

  const now = new Date();
  const window7 = new Date(now);
  window7.setDate(window7.getDate() - 6);
  const window28 = new Date(now);
  window28.setDate(window28.getDate() - 27);

  const { data: sessions, error: sessionsError } = (await admin
    .from("workout_sessions")
    .select("id, started_at, title, notes")
    .eq("user_id", context.userId)
    .eq("client_id", clientId)
    .gte("started_at", window28.toISOString())
    .order("started_at", { ascending: false })
    .limit(96)) as {
    data: SessionAnalyticsRow[] | null;
    error: { message: string } | null;
  };

  if (sessionsError) {
    throw new Error(sessionsError.message);
  }

  const rows = sessions ?? [];

  if (rows.length === 0) {
    return createEmptyAnalytics(clientId);
  }

  const sessionIdToDate = new Map(rows.map((row) => [row.id, new Date(row.started_at)]));
  const sessionIds = rows.map((row) => row.id);
  const weeklySessionIds = rows
    .filter((row) => new Date(row.started_at) >= window7)
    .map((row) => row.id);
  const weeklySessionIdSet = new Set(weeklySessionIds);
  const observedWeeks = Math.max(new Set(rows.map((row) => getWeekKey(row.started_at))).size, 1);

  const { data: entries, error: entriesError } = (await admin
    .from("workout_entries")
    .select("id, session_id, exercise_id")
    .in("session_id", sessionIds)) as {
    data: EntryAnalyticsRow[] | null;
    error: { message: string } | null;
  };

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const entryRows = entries ?? [];
  const entryIds = entryRows.map((entry) => entry.id);
  const exerciseIds = Array.from(
    new Set(entryRows.map((entry) => entry.exercise_id).filter((value): value is string => Boolean(value))),
  );

  const { data: sets, error: setsError } = entryIds.length
    ? ((await admin
        .from("workout_sets")
        .select("entry_id, reps, weight_kg")
        .in("entry_id", entryIds)) as {
        data: SetAnalyticsRow[] | null;
        error: { message: string } | null;
      })
    : { data: [], error: null };

  if (setsError) {
    throw new Error(setsError.message);
  }

  const { data: exercises, error: exercisesError } = exerciseIds.length
    ? ((await admin
        .from("exercises")
        .select("id, stimulus_vector, movement_pattern, cns_tax_multiplier")
        .in("id", exerciseIds)) as {
        data: ExerciseAnalyticsRow[] | null;
        error: { message: string } | null;
      })
    : { data: [], error: null };

  if (exercisesError) {
    throw new Error(exercisesError.message);
  }

  const setStatsByEntry = new Map<string, { count: number; loadKg: number }>();

  for (const set of sets ?? []) {
    const current = setStatsByEntry.get(set.entry_id) ?? { count: 0, loadKg: 0 };
    const reps = set.reps ?? 0;
    const weightKg = toNumber(set.weight_kg) || 0;
    current.count += 1;
    current.loadKg += reps > 0 ? reps * weightKg : weightKg;
    setStatsByEntry.set(set.entry_id, current);
  }

  const exerciseById = new Map((exercises ?? []).map((exercise) => [exercise.id, exercise]));
  const actualPattern = createEmptyPatternMap();
  const actualStimulus = createEmptyStimulusMap();
  const actualLoadByStimulus = createEmptyStimulusMap();
  let weeklyNeuralCost = 0;
  let totalNeuralCost28 = 0;

  for (const entry of entryRows) {
    if (!entry.exercise_id) {
      continue;
    }

    const exercise = exerciseById.get(entry.exercise_id);

    if (!exercise) {
      continue;
    }

    const stats = setStatsByEntry.get(entry.id) ?? { count: 1, loadKg: 0 };
    const setCount = Math.max(stats.count, 1);
    actualPattern.set(
      exercise.movement_pattern,
      (actualPattern.get(exercise.movement_pattern) ?? 0) + setCount,
    );
    actualStimulus.set(
      exercise.stimulus_vector,
      (actualStimulus.get(exercise.stimulus_vector) ?? 0) + setCount,
    );
    actualLoadByStimulus.set(
      exercise.stimulus_vector,
      (actualLoadByStimulus.get(exercise.stimulus_vector) ?? 0) + stats.loadKg,
    );

    const entryNeuralCost = setCount * (toNumber(exercise.cns_tax_multiplier) || 0);
    totalNeuralCost28 += entryNeuralCost;

    if (weeklySessionIdSet.has(entry.session_id)) {
      weeklyNeuralCost += entryNeuralCost;
    }
  }

  const { data: recoveryRows, error: recoveryError } = weeklySessionIds.length
    ? ((await admin
        .from("v_workout_muscle_load")
        .select("session_id, recovery_time_dynamic_hours")
        .in("session_id", weeklySessionIds)) as {
        data: RecoveryAnalyticsRow[] | null;
        error: { message: string } | null;
      })
    : { data: [], error: null };

  if (recoveryError) {
    throw new Error(recoveryError.message);
  }

  const maxRecoveryHours = Math.max(
    0,
    ...(recoveryRows ?? []).map((row) => row.recovery_time_dynamic_hours),
  );
  const latestSessionDate = rows[0] ? sessionIdToDate.get(rows[0].id) ?? now : now;
  const hoursSinceLastSession = Math.max((now.getTime() - latestSessionDate.getTime()) / 36e5, 0);
  const recoveryGapHours = Number(Math.max(maxRecoveryHours - hoursSinceLastSession, 0).toFixed(1));

  const weeklyMetas = rows
    .filter((row) => new Date(row.started_at) >= window7)
    .map((row) => parseSessionMeta(row.notes))
    .filter((value): value is NonNullable<ReturnType<typeof parseSessionMeta>> => Boolean(value));

  const nutritionSupportRatio = weeklyMetas.length
    ? Number(
        (
          weeklyMetas.reduce((sum, item) => sum + (item.carbsTargetRatio + item.hydrationTargetRatio) / 2, 0) /
          weeklyMetas.length
        ).toFixed(2),
      )
    : 1;
  const weeklyNeuralCostRounded = Number(weeklyNeuralCost.toFixed(1));
  const activeDays = new Set(
    rows
      .filter((row) => new Date(row.started_at) >= window7)
      .map((row) => getDateKey(row.started_at)),
  ).size;

  const planTargets = await resolvePlanTargets(context.userId, clientId);
  const calibratedTarget = calibrateWeeklyNeuralTarget({
    plannedTarget: planTargets.weeklyNeuralTarget,
    weeklyNeuralCost: weeklyNeuralCostRounded,
    totalNeuralCost28,
    observedWeeks,
  });
  const weeklyNeuralTarget = calibratedTarget.calibratedTarget;
  const blendedTargetPattern = blendTargetMap(planTargets.targetPattern, actualPattern, {
    minimumPlanVolume: 14,
    maxBlendWeight: 0.42,
  });
  const blendedTargetStimulus = blendTargetMap(planTargets.targetStimulus, actualStimulus, {
    minimumPlanVolume: 10,
    maxBlendWeight: 0.38,
  });
  const targetSupportRatio = Number(
    clamp(
      weeklyNeuralTarget > 0 ? weeklyNeuralCostRounded / weeklyNeuralTarget : 1,
      0.8,
      1.35,
    ).toFixed(2),
  );
  const nutritionRecoveryGap = Number(
    Math.max(targetSupportRatio - nutritionSupportRatio, 0).toFixed(2),
  );
  const weeklyNeuralDelta = Number((weeklyNeuralCostRounded - weeklyNeuralTarget).toFixed(1));
  const radarAxes = toRadarAxes(actualPattern, blendedTargetPattern);
  const readiness = computeReadinessFromTelemetry({
    weeklyNeuralCost: weeklyNeuralCostRounded,
    weeklyNeuralTarget,
    recoveryGapHours,
    nutritionRecoveryGap,
    activeDays,
    weeklySessionCount: weeklySessionIds.length,
    observedWeeks,
  });

  const responsePayload = {
    status: "connected",
    storage: "supabase",
    analytics: {
      clientId,
      readiness,
      weeklyNeuralCost: weeklyNeuralCostRounded,
      weeklyNeuralTarget,
      weeklyNeuralDelta,
      recoveryGapHours,
      nutritionRecoveryGap,
      nutritionSupportRatio,
      targetSupportRatio,
      radarAxes,
      stimulusBalance: stimulusVectorOrder.map((stimulusVector) => ({
        stimulusVector,
        actualSets: Math.round(actualStimulus.get(stimulusVector) ?? 0),
        targetSets: Number((blendedTargetStimulus.get(stimulusVector) ?? 0).toFixed(1)),
        actualLoadKg: Number((actualLoadByStimulus.get(stimulusVector) ?? 0).toFixed(1)),
      })),
      ...(planTargets.referenceTemplateName
        ? { referenceTemplateName: planTargets.referenceTemplateName }
        : {}),
      ...(planTargets.referenceProtocolName
        ? { referenceProtocolName: planTargets.referenceProtocolName }
        : {}),
    },
  };

  return clientProfileAnalyticsResponseSchema.parse(responsePayload);
}