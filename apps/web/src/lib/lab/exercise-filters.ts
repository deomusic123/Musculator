export const movementPatternValues = [
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "knee_dominant",
  "hip_hinge",
  "isolation",
  "core_anti_movement",
  "rotation_ballistic",
  "locomotion_metabolic",
] as const;

export const stimulusVectorValues = [
  "amplitud",
  "densidad",
  "fuerza",
  "cardio_metabolico",
  "acondicionamiento",
  "potencia",
] as const;

export const equipmentFilterValues = ["all", "barra", "mancuerna", "maquina", "cable"] as const;
export const cnsFilterValues = ["all", "1-3", "4-6", "7-10"] as const;

export type MovementPatternValue = (typeof movementPatternValues)[number];
export type StimulusVectorValue = (typeof stimulusVectorValues)[number];
export type EquipmentFilter = (typeof equipmentFilterValues)[number];
export type CnsFilter = (typeof cnsFilterValues)[number];

export interface LabExerciseFilters {
  q: string;
  pattern: MovementPatternValue | "all";
  vector: StimulusVectorValue | "all";
  equipment: EquipmentFilter;
  cns: CnsFilter;
}

interface LabExerciseFilterTarget {
  slug: string;
  name: string;
  movementPattern: MovementPatternValue;
  stimulusVector: StimulusVectorValue;
  equipment: string;
  cnsTaxMultiplier: number;
  primaryMuscle: {
    name: string;
    slug: string;
  };
  primaryMuscles: Array<{
    name: string;
    slug: string;
  }>;
  synergistMuscles: Array<{
    name: string;
    slug: string;
  }>;
}

export const defaultLabExerciseFilters: LabExerciseFilters = {
  q: "",
  pattern: "all",
  vector: "all",
  equipment: "all",
  cns: "all",
};

function firstParam(raw: string | string[] | undefined) {
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }

  return raw ?? "";
}

function isMovementPatternValue(value: string): value is MovementPatternValue {
  return (movementPatternValues as readonly string[]).includes(value);
}

function isStimulusVectorValue(value: string): value is StimulusVectorValue {
  return (stimulusVectorValues as readonly string[]).includes(value);
}

function isEquipmentFilter(value: string): value is EquipmentFilter {
  return (equipmentFilterValues as readonly string[]).includes(value);
}

function isCnsFilter(value: string): value is CnsFilter {
  return (cnsFilterValues as readonly string[]).includes(value);
}

export function normalizeEquipmentBucket(equipment: string): EquipmentFilter {
  const normalized = equipment.toLowerCase();

  if (normalized.includes("barra")) {
    return "barra";
  }

  if (normalized.includes("mancuerna")) {
    return "mancuerna";
  }

  if (normalized.includes("maquina") || normalized.includes("machine")) {
    return "maquina";
  }

  if (normalized.includes("polea") || normalized.includes("cable")) {
    return "cable";
  }

  return "all";
}

function parseFiltersFromRecord(params: Record<string, string | string[] | undefined> | undefined): LabExerciseFilters {
  const qRaw = firstParam(params?.q).trim().slice(0, 120);
  const patternRaw = firstParam(params?.pattern).trim();
  const vectorRaw = firstParam(params?.vector).trim();
  const equipmentRaw = firstParam(params?.equipment).trim();
  const cnsRaw = firstParam(params?.cns).trim();

  return {
    q: qRaw,
    pattern: patternRaw === "all" || patternRaw === "" ? "all" : isMovementPatternValue(patternRaw) ? patternRaw : "all",
    vector: vectorRaw === "all" || vectorRaw === "" ? "all" : isStimulusVectorValue(vectorRaw) ? vectorRaw : "all",
    equipment: equipmentRaw === "" ? "all" : isEquipmentFilter(equipmentRaw) ? equipmentRaw : "all",
    cns: cnsRaw === "" ? "all" : isCnsFilter(cnsRaw) ? cnsRaw : "all",
  };
}

export function parseLabExerciseFiltersFromRecord(
  params: Record<string, string | string[] | undefined> | undefined,
): LabExerciseFilters {
  return parseFiltersFromRecord(params);
}

export function parseLabExerciseFiltersFromUrlSearchParams(
  searchParams: { get(name: string): string | null },
): LabExerciseFilters {
  return parseFiltersFromRecord({
    q: searchParams.get("q") ?? undefined,
    pattern: searchParams.get("pattern") ?? undefined,
    vector: searchParams.get("vector") ?? undefined,
    equipment: searchParams.get("equipment") ?? undefined,
    cns: searchParams.get("cns") ?? undefined,
  });
}

export function buildLabExerciseFilterQueryString(filters: LabExerciseFilters) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.pattern !== "all") {
    params.set("pattern", filters.pattern);
  }

  if (filters.vector !== "all") {
    params.set("vector", filters.vector);
  }

  if (filters.equipment !== "all") {
    params.set("equipment", filters.equipment);
  }

  if (filters.cns !== "all") {
    params.set("cns", filters.cns);
  }

  return params.toString();
}

function passCnsFilter(cnsTaxMultiplier: number, cnsFilter: CnsFilter) {
  if (cnsFilter === "all") {
    return true;
  }

  if (cnsFilter === "1-3") {
    return cnsTaxMultiplier >= 1 && cnsTaxMultiplier < 4;
  }

  if (cnsFilter === "4-6") {
    return cnsTaxMultiplier >= 4 && cnsTaxMultiplier < 7;
  }

  return cnsTaxMultiplier >= 7 && cnsTaxMultiplier <= 10;
}

export function applyLabExerciseFilters<T extends LabExerciseFilterTarget>(
  exercises: T[],
  filters: LabExerciseFilters,
) {
  const normalizedQuery = filters.q.trim().toLowerCase();

  return exercises.filter((exercise) => {
    if (filters.pattern !== "all" && exercise.movementPattern !== filters.pattern) {
      return false;
    }

    if (filters.vector !== "all" && exercise.stimulusVector !== filters.vector) {
      return false;
    }

    if (filters.equipment !== "all" && normalizeEquipmentBucket(exercise.equipment) !== filters.equipment) {
      return false;
    }

    if (!passCnsFilter(exercise.cnsTaxMultiplier, filters.cns)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchable = [
      exercise.name,
      exercise.slug,
      exercise.equipment,
      exercise.primaryMuscle.name,
      exercise.primaryMuscle.slug,
      ...exercise.primaryMuscles.map((muscle) => muscle.name),
      ...exercise.primaryMuscles.map((muscle) => muscle.slug),
      ...exercise.synergistMuscles.map((muscle) => muscle.name),
      ...exercise.synergistMuscles.map((muscle) => muscle.slug),
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}
