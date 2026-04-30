import { randomUUID } from "node:crypto";
import {
  trainingTemplateBlueprintSchema,
  type TrainingTemplateBlueprint,
  type TrainingTemplateExercise,
  type TrainingTemplateSessionKind,
} from "@musculator/contracts";
import { trainingExerciseCatalog, trainingTemplates } from "@musculator/domain";
import type { Database } from "@/lib/platform/supabase-types";
import { createAdminSupabaseClient, getTrainingPersistenceContext } from "../platform/supabase-admin";

type TemplateRow = Database["public"]["Tables"]["training_templates"]["Row"];
type TemplateEntryRow = Database["public"]["Tables"]["training_template_entries"]["Row"];
type TemplateSetRow = Database["public"]["Tables"]["training_template_sets"]["Row"];
type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

export interface LabTemplateSummary {
  id: string;
  name: string;
  sessionKind: TrainingTemplateSessionKind;
  goal?: string;
  entryCount: number;
  estimatedNeuralCost: number;
  updatedAt: string;
}

export interface LabTemplateListResponse {
  status: "connected" | "preview";
  storage: "supabase" | "noop";
  templates: LabTemplateSummary[];
}

export interface LabTemplateDetailResponse {
  status: "connected" | "preview";
  storage: "supabase" | "noop";
  template: TrainingTemplateBlueprint;
  estimatedNeuralCost: number;
  updatedAt: string;
}

export interface LabTemplateSaveResponse extends LabTemplateDetailResponse {
  saveStatus: "saved" | "preview";
}

function normalizeCode(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || `template-${Date.now().toString(36)}`;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function computeEstimatedNeuralCost(entries: TrainingTemplateExercise[]) {
  const cnsBySlug = new Map(trainingExerciseCatalog.map((exercise) => [exercise.slug, exercise.cnsTaxMultiplier]));

  return Number(
    entries
      .reduce((sum, entry) => {
        const cns = entry.exerciseSlug ? cnsBySlug.get(entry.exerciseSlug) ?? 0 : 0;
        return sum + entry.targetSets * cns;
      }, 0)
      .toFixed(1),
  );
}

function buildPreviewSummary(template: TrainingTemplateBlueprint): LabTemplateSummary {
  return {
    id: template.id,
    name: template.name,
    sessionKind: template.sessionKind,
    ...(template.goal ? { goal: template.goal } : {}),
    entryCount: template.entries.length,
    estimatedNeuralCost: computeEstimatedNeuralCost(template.entries),
    updatedAt: new Date().toISOString(),
  };
}

function buildPreviewList(): LabTemplateListResponse {
  return {
    status: "preview",
    storage: "noop",
    templates: trainingTemplates.map(buildPreviewSummary),
  };
}

function resolvePreviewTemplate(id: string): TrainingTemplateBlueprint {
  const template = trainingTemplates.find((item) => item.id === id);

  if (!template) {
    throw new Error("Template no encontrado en modo preview.");
  }

  return template;
}

function mapTemplateFromRows(
  template: TemplateRow,
  entries: TemplateEntryRow[],
  sets: TemplateSetRow[],
  exercisesById: Map<string, ExerciseRow>,
): TrainingTemplateBlueprint {
  const setsByEntry = new Map<string, TemplateSetRow[]>();

  for (const set of sets) {
    const current = setsByEntry.get(set.template_entry_id) ?? [];
    current.push(set);
    setsByEntry.set(set.template_entry_id, current);
  }

  const mappedEntries = entries
    .sort((left, right) => left.sequence_index - right.sequence_index)
    .map((entry) => {
      const exercise = entry.exercise_id ? exercisesById.get(entry.exercise_id) : undefined;
      const entrySets = (setsByEntry.get(entry.id) ?? [])
        .sort((left, right) => left.set_index - right.set_index)
        .map((set) => ({
          setIndex: set.set_index,
          targetRepsMin: set.target_reps_min ?? undefined,
          targetRepsMax: set.target_reps_max ?? undefined,
          targetWeightKg: toNumber(set.target_weight_kg),
          targetDurationSeconds: set.target_duration_seconds ?? undefined,
          targetRpe: toNumber(set.target_rpe),
          notes: set.notes ?? undefined,
        }));

      const fallbackSet = {
        setIndex: 1,
        targetRepsMin: entry.target_reps_min ?? undefined,
        targetRepsMax: entry.target_reps_max ?? undefined,
        targetWeightKg: toNumber(entry.target_weight_kg),
        targetDurationSeconds: entry.target_duration_seconds ?? undefined,
        targetRpe: toNumber(entry.target_rpe),
        notes: entry.notes ?? undefined,
      };

      return {
        exerciseSlug: exercise?.slug,
        rawExerciseName: entry.raw_exercise_name ?? undefined,
        sequenceIndex: entry.sequence_index,
        targetSets: entry.target_sets,
        targetRepsMin: entry.target_reps_min ?? undefined,
        targetRepsMax: entry.target_reps_max ?? undefined,
        targetWeightKg: toNumber(entry.target_weight_kg),
        targetDurationSeconds: entry.target_duration_seconds ?? undefined,
        targetRpe: toNumber(entry.target_rpe),
        stimulusVector: entry.target_stimulus_vector ?? exercise?.stimulus_vector ?? undefined,
        notes: entry.notes ?? undefined,
        setTargets: entrySets.length > 0 ? entrySets : [fallbackSet],
      };
    });

  return trainingTemplateBlueprintSchema.parse({
    id: template.id,
    name: template.name,
    description: template.description ?? "",
    sessionKind: template.session_kind,
    goal: template.goal ?? undefined,
    entries: mappedEntries,
  });
}

async function resolveExercisesBySlug(slugs: string[]) {
  const admin = createAdminSupabaseClient();
  const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));

  if (uniqueSlugs.length === 0) {
    return new Map<string, ExerciseRow>();
  }

  const { data, error } = (await admin
    .from("exercises")
    .select("id, slug, name, primary_muscle_id, movement_pattern, stimulus_vector, resistance_profile, is_compound, equipment, cns_tax_multiplier, created_at")
    .in("slug", uniqueSlugs)) as {
    data: ExerciseRow[] | null;
    error: { message: string } | null;
  };

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((exercise) => [exercise.slug, exercise]));
}

async function replaceTemplateEntries(templateId: string, entries: TrainingTemplateExercise[]) {
  const admin = createAdminSupabaseClient();

  const slugs = entries.map((entry) => entry.exerciseSlug).filter((value): value is string => Boolean(value));
  const exercisesBySlug = await resolveExercisesBySlug(slugs);

  const entryPayload = entries.map((entry, index) => {
    const exercise = entry.exerciseSlug ? exercisesBySlug.get(entry.exerciseSlug) : undefined;

    return {
      template_id: templateId,
      exercise_id: exercise?.id ?? null,
      raw_exercise_name: entry.rawExerciseName ?? (exercise ? exercise.name : null),
      sequence_index: index,
      target_sets: entry.targetSets,
      target_reps_min: entry.targetRepsMin ?? null,
      target_reps_max: entry.targetRepsMax ?? null,
      target_weight_kg: entry.targetWeightKg ?? null,
      target_duration_seconds: entry.targetDurationSeconds ?? null,
      target_rpe: entry.targetRpe ?? null,
      target_stimulus_vector: entry.stimulusVector ?? exercise?.stimulus_vector ?? null,
      notes: entry.notes ?? null,
    };
  });

  const { data: insertedEntries, error: insertEntriesError } = (await admin
    .from("training_template_entries")
    .insert(entryPayload)
    .select(
      "id, template_id, exercise_id, raw_exercise_name, sequence_index, target_sets, target_reps_min, target_reps_max, target_weight_kg, target_duration_seconds, target_rpe, target_stimulus_vector, notes, created_at",
    )) as {
    data: TemplateEntryRow[] | null;
    error: { message: string } | null;
  };

  if (insertEntriesError) {
    throw new Error(insertEntriesError.message);
  }

  const entryIdBySequence = new Map((insertedEntries ?? []).map((entry) => [entry.sequence_index, entry.id]));

  const setPayload = entries.flatMap((entry, index) => {
    const templateEntryId = entryIdBySequence.get(index);

    if (!templateEntryId) {
      return [];
    }

    return entry.setTargets.map((set, setIndex) => ({
      template_entry_id: templateEntryId,
      set_index: set.setIndex ?? setIndex + 1,
      target_reps_min: set.targetRepsMin ?? null,
      target_reps_max: set.targetRepsMax ?? null,
      target_weight_kg: set.targetWeightKg ?? null,
      target_duration_seconds: set.targetDurationSeconds ?? null,
      target_rpe: set.targetRpe ?? null,
      notes: set.notes ?? null,
    }));
  });

  if (setPayload.length > 0) {
    const { error: insertSetsError } = await admin.from("training_template_sets").insert(setPayload);

    if (insertSetsError) {
      throw new Error(insertSetsError.message);
    }
  }
}

async function listConnectedTemplates(userId: string): Promise<LabTemplateListResponse> {
  const admin = createAdminSupabaseClient();

  const { data: templates, error: templatesError } = (await admin
    .from("training_templates")
    .select("id, owner_user_id, code, name, description, session_kind, goal, is_system, created_at, updated_at")
    .order("updated_at", { ascending: false })) as {
    data: TemplateRow[] | null;
    error: { message: string } | null;
  };

  if (templatesError) {
    throw new Error(templatesError.message);
  }

  const visibleTemplates = (templates ?? []).filter(
    (template) => template.is_system || template.owner_user_id === userId,
  );

  const templateIds = visibleTemplates.map((template) => template.id);

  if (templateIds.length === 0) {
    return {
      status: "connected",
      storage: "supabase",
      templates: [],
    };
  }

  const { data: entries, error: entriesError } = (await admin
    .from("training_template_entries")
    .select(
      "id, template_id, exercise_id, raw_exercise_name, sequence_index, target_sets, target_reps_min, target_reps_max, target_weight_kg, target_duration_seconds, target_rpe, target_stimulus_vector, notes, created_at",
    )
    .in("template_id", templateIds)) as {
    data: TemplateEntryRow[] | null;
    error: { message: string } | null;
  };

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const exerciseIds = Array.from(
    new Set((entries ?? []).map((entry) => entry.exercise_id).filter((value): value is string => Boolean(value))),
  );

  const exercisesById = new Map<string, ExerciseRow>();

  if (exerciseIds.length > 0) {
    const { data: exercises, error: exercisesError } = (await admin
      .from("exercises")
      .select(
        "id, slug, name, primary_muscle_id, movement_pattern, stimulus_vector, resistance_profile, is_compound, equipment, cns_tax_multiplier, created_at",
      )
      .in("id", exerciseIds)) as {
      data: ExerciseRow[] | null;
      error: { message: string } | null;
    };

    if (exercisesError) {
      throw new Error(exercisesError.message);
    }

    for (const exercise of exercises ?? []) {
      exercisesById.set(exercise.id, exercise);
    }
  }

  const entriesByTemplate = new Map<string, TemplateEntryRow[]>();

  for (const entry of entries ?? []) {
    const current = entriesByTemplate.get(entry.template_id) ?? [];
    current.push(entry);
    entriesByTemplate.set(entry.template_id, current);
  }

  const summaries = visibleTemplates.map((template) => {
    const templateEntries = entriesByTemplate.get(template.id) ?? [];
    const estimatedNeuralCost = Number(
      templateEntries
        .reduce((sum, entry) => {
          const exercise = entry.exercise_id ? exercisesById.get(entry.exercise_id) : undefined;
          const cnsTax = exercise ? toNumber(exercise.cns_tax_multiplier) ?? 0 : 0;

          return sum + entry.target_sets * cnsTax;
        }, 0)
        .toFixed(1),
    );

    return {
      id: template.id,
      name: template.name,
      sessionKind: template.session_kind,
      ...(template.goal ? { goal: template.goal } : {}),
      entryCount: templateEntries.length,
      estimatedNeuralCost,
      updatedAt: template.updated_at,
    };
  });

  return {
    status: "connected",
    storage: "supabase",
    templates: summaries,
  };
}

export async function listLabTemplates(): Promise<LabTemplateListResponse> {
  const context = await getTrainingPersistenceContext();

  if (!context.configured || !context.userId) {
    return buildPreviewList();
  }

  return listConnectedTemplates(context.userId);
}

export async function getLabTemplateById(id: string): Promise<LabTemplateDetailResponse> {
  const context = await getTrainingPersistenceContext();

  if (!context.configured || !context.userId) {
    const previewTemplate = resolvePreviewTemplate(id);

    return {
      status: "preview",
      storage: "noop",
      template: previewTemplate,
      estimatedNeuralCost: computeEstimatedNeuralCost(previewTemplate.entries),
      updatedAt: new Date().toISOString(),
    };
  }

  const admin = createAdminSupabaseClient();

  const { data: template, error: templateError } = (await admin
    .from("training_templates")
    .select("id, owner_user_id, code, name, description, session_kind, goal, is_system, created_at, updated_at")
    .eq("id", id)
    .maybeSingle()) as {
    data: TemplateRow | null;
    error: { message: string } | null;
  };

  if (templateError) {
    throw new Error(templateError.message);
  }

  if (!template) {
    throw new Error("Template no encontrado.");
  }

  if (!template.is_system && template.owner_user_id !== context.userId) {
    throw new Error("Template fuera de alcance para el usuario actual.");
  }

  const { data: entries, error: entriesError } = (await admin
    .from("training_template_entries")
    .select(
      "id, template_id, exercise_id, raw_exercise_name, sequence_index, target_sets, target_reps_min, target_reps_max, target_weight_kg, target_duration_seconds, target_rpe, target_stimulus_vector, notes, created_at",
    )
    .eq("template_id", id)
    .order("sequence_index", { ascending: true })) as {
    data: TemplateEntryRow[] | null;
    error: { message: string } | null;
  };

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const entryIds = (entries ?? []).map((entry) => entry.id);
  const exerciseIds = Array.from(
    new Set((entries ?? []).map((entry) => entry.exercise_id).filter((value): value is string => Boolean(value))),
  );

  const sets: TemplateSetRow[] = [];

  if (entryIds.length > 0) {
    const { data: setRows, error: setsError } = (await admin
      .from("training_template_sets")
      .select(
        "id, template_entry_id, set_index, target_reps_min, target_reps_max, target_weight_kg, target_duration_seconds, target_rpe, notes, created_at",
      )
      .in("template_entry_id", entryIds)
      .order("set_index", { ascending: true })) as {
      data: TemplateSetRow[] | null;
      error: { message: string } | null;
    };

    if (setsError) {
      throw new Error(setsError.message);
    }

    sets.push(...(setRows ?? []));
  }

  const exercisesById = new Map<string, ExerciseRow>();

  if (exerciseIds.length > 0) {
    const { data: exercises, error: exercisesError } = (await admin
      .from("exercises")
      .select(
        "id, slug, name, primary_muscle_id, movement_pattern, stimulus_vector, resistance_profile, is_compound, equipment, cns_tax_multiplier, created_at",
      )
      .in("id", exerciseIds)) as {
      data: ExerciseRow[] | null;
      error: { message: string } | null;
    };

    if (exercisesError) {
      throw new Error(exercisesError.message);
    }

    for (const exercise of exercises ?? []) {
      exercisesById.set(exercise.id, exercise);
    }
  }

  const blueprint = mapTemplateFromRows(template, entries ?? [], sets, exercisesById);

  return {
    status: "connected",
    storage: "supabase",
    template: blueprint,
    estimatedNeuralCost: computeEstimatedNeuralCost(blueprint.entries),
    updatedAt: template.updated_at,
  };
}

export async function createLabTemplate(template: TrainingTemplateBlueprint): Promise<LabTemplateSaveResponse> {
  const parsed = trainingTemplateBlueprintSchema.parse(template);
  const context = await getTrainingPersistenceContext();

  if (!context.configured || !context.userId) {
    return {
      saveStatus: "preview",
      status: "preview",
      storage: "noop",
      template: parsed,
      estimatedNeuralCost: computeEstimatedNeuralCost(parsed.entries),
      updatedAt: new Date().toISOString(),
    };
  }

  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data: insertedTemplate, error: insertTemplateError } = (await admin
    .from("training_templates")
    .insert({
      owner_user_id: context.userId,
      code: `${normalizeCode(parsed.id)}-${Date.now().toString(36)}`,
      name: parsed.name,
      description: parsed.description,
      session_kind: parsed.sessionKind,
      goal: parsed.goal ?? null,
      is_system: false,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()) as {
    data: { id: string } | null;
    error: { message: string } | null;
  };

  if (insertTemplateError || !insertedTemplate) {
    throw new Error(insertTemplateError?.message ?? "No se pudo crear el template.");
  }

  await replaceTemplateEntries(insertedTemplate.id, parsed.entries);

  const detail = await getLabTemplateById(insertedTemplate.id);

  return {
    saveStatus: "saved",
    ...detail,
  };
}

export async function updateLabTemplate(
  templateId: string,
  template: TrainingTemplateBlueprint,
): Promise<LabTemplateSaveResponse> {
  const parsed = trainingTemplateBlueprintSchema.parse({ ...template, id: templateId });
  const context = await getTrainingPersistenceContext();

  if (!context.configured || !context.userId) {
    return {
      saveStatus: "preview",
      status: "preview",
      storage: "noop",
      template: parsed,
      estimatedNeuralCost: computeEstimatedNeuralCost(parsed.entries),
      updatedAt: new Date().toISOString(),
    };
  }

  const admin = createAdminSupabaseClient();

  const { data: existingTemplate, error: existingError } = (await admin
    .from("training_templates")
    .select("id, owner_user_id")
    .eq("id", templateId)
    .maybeSingle()) as {
    data: Pick<TemplateRow, "id" | "owner_user_id"> | null;
    error: { message: string } | null;
  };

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existingTemplate) {
    throw new Error("Template no encontrado para actualizar.");
  }

  if (existingTemplate.owner_user_id !== context.userId) {
    throw new Error("No se puede editar un template fuera de alcance del usuario actual.");
  }

  const { error: updateTemplateError } = await admin
    .from("training_templates")
    .update({
      name: parsed.name,
      description: parsed.description,
      session_kind: parsed.sessionKind,
      goal: parsed.goal ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId);

  if (updateTemplateError) {
    throw new Error(updateTemplateError.message);
  }

  const { error: deleteEntriesError } = await admin
    .from("training_template_entries")
    .delete()
    .eq("template_id", templateId);

  if (deleteEntriesError) {
    throw new Error(deleteEntriesError.message);
  }

  await replaceTemplateEntries(templateId, parsed.entries);

  const detail = await getLabTemplateById(templateId);

  return {
    saveStatus: "saved",
    ...detail,
  };
}

export function buildDraftTemplate(id: string, exerciseSlug?: string): TrainingTemplateBlueprint {
  const entrySlug = exerciseSlug ?? trainingExerciseCatalog[0]?.slug;

  return {
    id,
    name: "Nuevo template",
    description: "",
    sessionKind: "strength",
    goal: "",
    entries: [
      {
        exerciseSlug: entrySlug,
        sequenceIndex: 0,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 8,
        targetWeightKg: undefined,
        targetDurationSeconds: undefined,
        targetRpe: 8,
        stimulusVector: trainingExerciseCatalog.find((exercise) => exercise.slug === entrySlug)?.stimulusVector,
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

export function templateId() {
  return `tmpl-${randomUUID().slice(0, 8)}`;
}
