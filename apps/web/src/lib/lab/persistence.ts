import type { TrainingExerciseCatalogItem } from "@musculator/contracts";
import { trainingExerciseCatalog } from "@musculator/domain";
import type { Database, Json } from "@/lib/platform/supabase-types";
import { createAdminSupabaseClient, getTrainingPersistenceContext } from "../platform/supabase-admin";

type MuscleRole = Database["public"]["Enums"]["muscle_role"];
type MovementPattern = Database["public"]["Enums"]["movement_pattern"];
type StimulusVector = Database["public"]["Enums"]["stimulus_vector"];
type ResistanceProfile = Database["public"]["Enums"]["resistance_profile"];
type CatalogViewRow = Database["public"]["Views"]["v_exercise_catalog"]["Row"];
type MuscleGroupRow = Database["public"]["Tables"]["muscle_groups"]["Row"];
type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
type ExerciseMuscleRow = Database["public"]["Tables"]["exercise_muscles"]["Row"];
type MuscleGroupLookup = Pick<MuscleGroupRow, "id" | "slug" | "name" | "category" | "recovery_time_hours">;

interface RawMuscleMapItem {
  slug?: string;
  muscle_slug?: string;
  name?: string;
  muscle_name?: string;
  role?: string;
}

export interface LabExerciseMuscleTag {
  slug: string;
  name: string;
  role: MuscleRole;
}

export interface LabExerciseListItem {
  slug: string;
  name: string;
  category: string;
  movementPattern: MovementPattern;
  stimulusVector: StimulusVector;
  resistanceProfile: ResistanceProfile;
  isCompound: boolean;
  equipment: string;
  cnsTaxMultiplier: number;
  recoveryTimeHours: number;
  primaryMuscle: {
    slug: string;
    name: string;
    category: string;
  };
  primaryMuscles: LabExerciseMuscleTag[];
  synergistMuscles: LabExerciseMuscleTag[];
}

export interface LabExerciseListResponse {
  status: "connected" | "preview";
  storage: "supabase" | "noop";
  exercises: LabExerciseListItem[];
}

const validMuscleRoles = new Set<MuscleRole>(["primary", "secondary", "stabilizer"]);

function slugToLabel(slug: string) {
  return slug
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

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

function parseJsonArray(raw: Json) {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function parseMuscleMap(raw: Json): LabExerciseMuscleTag[] {
  const parsed = parseJsonArray(raw);
  const uniqueTags = new Map<string, LabExerciseMuscleTag>();

  for (const item of parsed) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const candidate = item as RawMuscleMapItem;
    const resolvedSlug = candidate.slug ?? candidate.muscle_slug;
    const resolvedName = candidate.name ?? candidate.muscle_name;
    const resolvedRole = candidate.role?.toLowerCase();

    if (!resolvedSlug || !resolvedName || !resolvedRole || !validMuscleRoles.has(resolvedRole as MuscleRole)) {
      continue;
    }

    const key = `${resolvedSlug}:${resolvedRole}`;

    if (!uniqueTags.has(key)) {
      uniqueTags.set(key, {
        slug: resolvedSlug,
        name: resolvedName,
        role: resolvedRole as MuscleRole,
      });
    }
  }

  return Array.from(uniqueTags.values())
    .flatMap((item) => {
      return [item];
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function toPreviewItem(exercise: TrainingExerciseCatalogItem): LabExerciseListItem {
  const primaryMuscleName = slugToLabel(exercise.primaryMuscle);

  return {
    slug: exercise.slug,
    name: exercise.name,
    category: exercise.category,
    movementPattern: exercise.movementPattern,
    stimulusVector: exercise.stimulusVector,
    resistanceProfile: exercise.resistanceProfile,
    isCompound: exercise.isCompound,
    equipment: exercise.equipment,
    cnsTaxMultiplier: exercise.cnsTaxMultiplier,
    recoveryTimeHours: exercise.recoveryTimeHours,
    primaryMuscle: {
      slug: exercise.primaryMuscle,
      name: primaryMuscleName,
      category: exercise.category,
    },
    primaryMuscles: [
      {
        slug: exercise.primaryMuscle,
        name: primaryMuscleName,
        role: "primary",
      },
    ],
    synergistMuscles: exercise.secondaryMuscles.map((secondary) => ({
      slug: secondary,
      name: slugToLabel(secondary),
      role: "secondary",
    })),
  };
}

function buildPreviewResponse(): LabExerciseListResponse {
  return {
    status: "preview",
    storage: "noop",
    exercises: [...trainingExerciseCatalog]
      .map(toPreviewItem)
      .sort((left, right) => right.cnsTaxMultiplier - left.cnsTaxMultiplier),
  };
}

function toCatalogItem(
  row: CatalogViewRow,
  muscleGroupsBySlug: Map<string, MuscleGroupLookup>,
): LabExerciseListItem {
  const primarySlug = row.primary_muscle_slug ?? "core";
  const primaryGroup = muscleGroupsBySlug.get(primarySlug);
  const primaryName = row.primary_muscle_name ?? primaryGroup?.name ?? slugToLabel(primarySlug);
  const primaryCategory = row.primary_muscle_category ?? primaryGroup?.category ?? "General";
  const recoveryTimeHours = primaryGroup?.recovery_time_hours ?? 48;
  const muscleMap = parseMuscleMap(row.muscle_map);

  const primaryMuscles = muscleMap.filter((muscle) => muscle.role === "primary");
  const resolvedPrimaryMuscles = primaryMuscles.length > 0
    ? primaryMuscles
    : [
      {
        slug: primarySlug,
        name: primaryName,
        role: "primary" as const,
      },
    ];

  return {
    slug: row.slug,
    name: row.name,
    category: primaryCategory,
    movementPattern: row.movement_pattern,
    stimulusVector: row.stimulus_vector,
    resistanceProfile: row.resistance_profile,
    isCompound: row.is_compound,
    equipment: row.equipment ?? "Sin equipamiento",
    cnsTaxMultiplier: toNumber(row.cns_tax_multiplier),
    recoveryTimeHours,
    primaryMuscle: {
      slug: primarySlug,
      name: primaryName,
      category: primaryCategory,
    },
    primaryMuscles: resolvedPrimaryMuscles,
    synergistMuscles: muscleMap.filter((muscle) => muscle.role !== "primary"),
  };
}

function isLegacyCatalogViewError(message: string) {
  const normalized = message.toLowerCase();

  return normalized.includes("v_exercise_catalog") && normalized.includes("does not exist");
}

async function listCatalogFromExercisesTables(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  muscleGroupsById: Map<string, MuscleGroupLookup>,
): Promise<LabExerciseListItem[]> {
  const { data: exerciseRows, error: exercisesError } = (await admin
    .from("exercises")
    .select(
      "id, slug, name, primary_muscle_id, movement_pattern, stimulus_vector, resistance_profile, is_compound, equipment, cns_tax_multiplier, created_at",
    )) as {
    data: ExerciseRow[] | null;
    error: { message: string } | null;
  };

  if (exercisesError) {
    throw new Error(exercisesError.message);
  }

  const { data: exerciseMuscleRows, error: exerciseMusclesError } = (await admin
    .from("exercise_muscles")
    .select("exercise_id, muscle_group_id, role, created_at")) as {
    data: ExerciseMuscleRow[] | null;
    error: { message: string } | null;
  };

  if (exerciseMusclesError) {
    throw new Error(exerciseMusclesError.message);
  }

  const muscleTagsByExerciseId = new Map<string, LabExerciseMuscleTag[]>();

  for (const relation of exerciseMuscleRows ?? []) {
    const muscle = muscleGroupsById.get(relation.muscle_group_id);

    if (!muscle) {
      continue;
    }

    const previous = muscleTagsByExerciseId.get(relation.exercise_id) ?? [];

    previous.push({
      slug: muscle.slug,
      name: muscle.name,
      role: relation.role,
    });

    muscleTagsByExerciseId.set(relation.exercise_id, previous);
  }

  return (exerciseRows ?? [])
    .map((exercise) => {
      const primaryMuscle = exercise.primary_muscle_id ? muscleGroupsById.get(exercise.primary_muscle_id) : undefined;
      const exerciseTags = muscleTagsByExerciseId.get(exercise.id) ?? [];
      const primaryMusclesFromMap = exerciseTags.filter((tag) => tag.role === "primary");
      const primarySlug = primaryMuscle?.slug ?? "core";
      const primaryName = primaryMuscle?.name ?? slugToLabel(primarySlug);
      const primaryCategory = primaryMuscle?.category ?? "General";

      return {
        slug: exercise.slug,
        name: exercise.name,
        category: primaryCategory,
        movementPattern: exercise.movement_pattern,
        stimulusVector: exercise.stimulus_vector,
        resistanceProfile: exercise.resistance_profile,
        isCompound: exercise.is_compound,
        equipment: exercise.equipment ?? "Sin equipamiento",
        cnsTaxMultiplier: toNumber(exercise.cns_tax_multiplier),
        recoveryTimeHours: primaryMuscle?.recovery_time_hours ?? 48,
        primaryMuscle: {
          slug: primarySlug,
          name: primaryName,
          category: primaryCategory,
        },
        primaryMuscles:
          primaryMusclesFromMap.length > 0
            ? primaryMusclesFromMap
            : [
              {
                slug: primarySlug,
                name: primaryName,
                role: "primary" as const,
              },
            ],
        synergistMuscles: exerciseTags.filter((tag) => tag.role !== "primary"),
      };
    })
    .sort((left, right) => right.cnsTaxMultiplier - left.cnsTaxMultiplier || left.name.localeCompare(right.name));
}

export async function listLabExercises(): Promise<LabExerciseListResponse> {
  const context = await getTrainingPersistenceContext();

  if (!context.configured) {
    return buildPreviewResponse();
  }

  const admin = createAdminSupabaseClient();

  const { data: muscleRows, error: musclesError } = (await admin
    .from("muscle_groups")
    .select("id, slug, name, category, recovery_time_hours")) as {
    data: MuscleGroupLookup[] | null;
    error: { message: string } | null;
  };

  if (musclesError) {
    throw new Error(musclesError.message);
  }

  const muscleGroupsById = new Map((muscleRows ?? []).map((muscle) => [muscle.id, muscle]));
  const muscleGroupsBySlug = new Map((muscleRows ?? []).map((muscle) => [muscle.slug, muscle]));

  const { data: catalogRows, error: catalogError } = (await admin
    .from("v_exercise_catalog")
    .select(
      "slug, name, movement_pattern, stimulus_vector, resistance_profile, is_compound, equipment, cns_tax_multiplier, primary_muscle_slug, primary_muscle_name, primary_muscle_category, muscle_map",
    )) as {
    data: CatalogViewRow[] | null;
    error: { message: string } | null;
  };

  if (catalogError) {
    if (isLegacyCatalogViewError(catalogError.message)) {
      try {
        const fallbackExercises = await listCatalogFromExercisesTables(admin, muscleGroupsById);

        return {
          status: "connected",
          storage: context.storage,
          exercises: fallbackExercises,
        };
      } catch {
        return buildPreviewResponse();
      }
    }

    throw new Error(catalogError.message);
  }

  const exercises = (catalogRows ?? [])
    .map((row) => toCatalogItem(row, muscleGroupsBySlug))
    .sort((left, right) => right.cnsTaxMultiplier - left.cnsTaxMultiplier || left.name.localeCompare(right.name));

  return {
    status: "connected",
    storage: context.storage,
    exercises,
  };
}
