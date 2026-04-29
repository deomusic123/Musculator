import {
  trainingHistoryResponseSchema,
  trainingSessionSaveResponseSchema,
  type PersistedTrainingSessionSummary,
  type TrainingHistoryResponse,
  type TrainingSessionDraft,
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

const legacyTitlePrefix = "[musculator-title]";

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
      notes: session.notes ?? null,
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
        notes: encodeLegacyNotes(session.title, session.notes),
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