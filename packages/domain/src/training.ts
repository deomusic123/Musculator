import type {
  MuscleGroupSlug,
  MuscleLoadSummary,
  StimulusBalanceSlice,
  TrainingProtocolBlueprint,
  TrainingExerciseCatalogItem,
  TrainingRecoveryInputs,
  TrainingSessionAnalysis,
  TrainingSessionDraft,
  TrainingSessionSummary,
  TrainingTemplateBlueprint,
  WorkoutIntakeEntry,
  WorkoutIntakePayload,
  WorkoutSummary,
} from "@musculator/contracts";
import { calculateReadinessScore } from "./readiness";

const muscleMetadata: Record<MuscleGroupSlug, { label: string; category: string }> = {
  dorsal: { label: "Dorsal", category: "Espalda" },
  trapecio: { label: "Trapecio", category: "Espalda" },
  "deltoides-anterior": { label: "Deltoides anterior", category: "Hombro" },
  "deltoides-lateral": { label: "Deltoides lateral", category: "Hombro" },
  pectoral: { label: "Pectoral", category: "Pecho" },
  biceps: { label: "Biceps", category: "Brazo" },
  triceps: { label: "Triceps", category: "Brazo" },
  cuadriceps: { label: "Cuadriceps", category: "Pierna" },
  femoral: { label: "Femoral", category: "Pierna" },
  gluteo: { label: "Gluteo", category: "Pierna" },
  core: { label: "Core", category: "Core" },
  pantorrilla: { label: "Pantorrilla", category: "Pierna" },
};

export const trainingExerciseCatalog: TrainingExerciseCatalogItem[] = [
  {
    slug: "barbell-row",
    name: "Remo con barra",
    category: "Espalda",
    movementPattern: "horizontal_pull",
    primaryMuscle: "dorsal",
    secondaryMuscles: ["trapecio", "biceps"],
    stimulusVector: "densidad",
    resistanceProfile: "free_weight",
    isCompound: true,
    equipment: "Barra",
    cnsTaxMultiplier: 7.8,
    recoveryTimeHours: 72,
  },
  {
    slug: "lat-pulldown",
    name: "Jalon al pecho",
    category: "Espalda",
    movementPattern: "vertical_pull",
    primaryMuscle: "dorsal",
    secondaryMuscles: ["biceps"],
    stimulusVector: "amplitud",
    resistanceProfile: "cable",
    isCompound: false,
    equipment: "Polea",
    cnsTaxMultiplier: 5.2,
    recoveryTimeHours: 48,
  },
  {
    slug: "incline-bench-press",
    name: "Press inclinado",
    category: "Pecho",
    movementPattern: "horizontal_push",
    primaryMuscle: "pectoral",
    secondaryMuscles: ["deltoides-anterior", "triceps"],
    stimulusVector: "fuerza_base",
    resistanceProfile: "free_weight",
    isCompound: true,
    equipment: "Barra",
    cnsTaxMultiplier: 8.4,
    recoveryTimeHours: 72,
  },
  {
    slug: "machine-fly",
    name: "Aperturas en maquina",
    category: "Pecho",
    movementPattern: "horizontal_push",
    primaryMuscle: "pectoral",
    secondaryMuscles: ["deltoides-anterior"],
    stimulusVector: "amplitud",
    resistanceProfile: "machine",
    isCompound: false,
    equipment: "Maquina",
    cnsTaxMultiplier: 3.8,
    recoveryTimeHours: 48,
  },
  {
    slug: "overhead-press",
    name: "Press militar",
    category: "Hombro",
    movementPattern: "vertical_push",
    primaryMuscle: "deltoides-anterior",
    secondaryMuscles: ["triceps", "core"],
    stimulusVector: "fuerza_base",
    resistanceProfile: "free_weight",
    isCompound: true,
    equipment: "Barra",
    cnsTaxMultiplier: 8.1,
    recoveryTimeHours: 72,
  },
  {
    slug: "lateral-raise",
    name: "Elevacion lateral",
    category: "Hombro",
    movementPattern: "vertical_push",
    primaryMuscle: "deltoides-lateral",
    secondaryMuscles: ["trapecio"],
    stimulusVector: "amplitud",
    resistanceProfile: "free_weight",
    isCompound: false,
    equipment: "Mancuernas",
    cnsTaxMultiplier: 2.9,
    recoveryTimeHours: 48,
  },
  {
    slug: "back-squat",
    name: "Sentadilla trasera",
    category: "Pierna",
    movementPattern: "knee_dominant",
    primaryMuscle: "cuadriceps",
    secondaryMuscles: ["gluteo", "core"],
    stimulusVector: "fuerza_base",
    resistanceProfile: "free_weight",
    isCompound: true,
    equipment: "Barra",
    cnsTaxMultiplier: 9.4,
    recoveryTimeHours: 72,
  },
  {
    slug: "romanian-deadlift",
    name: "Peso muerto rumano",
    category: "Pierna",
    movementPattern: "hip_hinge",
    primaryMuscle: "femoral",
    secondaryMuscles: ["gluteo", "core"],
    stimulusVector: "amplitud",
    resistanceProfile: "free_weight",
    isCompound: true,
    equipment: "Barra",
    cnsTaxMultiplier: 8.7,
    recoveryTimeHours: 72,
  },
  {
    slug: "leg-press",
    name: "Prensa inclinada",
    category: "Pierna",
    movementPattern: "knee_dominant",
    primaryMuscle: "cuadriceps",
    secondaryMuscles: ["gluteo"],
    stimulusVector: "densidad",
    resistanceProfile: "machine",
    isCompound: true,
    equipment: "Maquina",
    cnsTaxMultiplier: 6.8,
    recoveryTimeHours: 72,
  },
  {
    slug: "hip-thrust",
    name: "Hip thrust",
    category: "Pierna",
    movementPattern: "hip_hinge",
    primaryMuscle: "gluteo",
    secondaryMuscles: ["femoral", "core"],
    stimulusVector: "densidad",
    resistanceProfile: "free_weight",
    isCompound: true,
    equipment: "Barra",
    cnsTaxMultiplier: 7.1,
    recoveryTimeHours: 72,
  },
  {
    slug: "barbell-curl",
    name: "Curl con barra",
    category: "Brazo",
    movementPattern: "horizontal_pull",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    stimulusVector: "amplitud",
    resistanceProfile: "free_weight",
    isCompound: false,
    equipment: "Barra",
    cnsTaxMultiplier: 2.6,
    recoveryTimeHours: 48,
  },
  {
    slug: "rope-pushdown",
    name: "Pushdown en cuerda",
    category: "Brazo",
    movementPattern: "vertical_push",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    stimulusVector: "densidad",
    resistanceProfile: "cable",
    isCompound: false,
    equipment: "Polea",
    cnsTaxMultiplier: 2.4,
    recoveryTimeHours: 48,
  },
  {
    slug: "heavy-bag-rounds",
    name: "Saco de boxeo",
    category: "Boxeo",
    movementPattern: "locomotion_metabolic",
    primaryMuscle: "core",
    secondaryMuscles: ["deltoides-anterior", "pectoral"],
    stimulusVector: "acondicionamiento",
    resistanceProfile: "specific",
    isCompound: false,
    equipment: "Saco",
    cnsTaxMultiplier: 6.1,
    recoveryTimeHours: 36,
  },
];

const defaultSetPresets: Record<string, Array<{ reps?: number; weightKg?: number; rpe?: number }>> = {
  "barbell-row": [
    { reps: 10, weightKg: 72.5, rpe: 8 },
    { reps: 10, weightKg: 72.5, rpe: 8 },
    { reps: 8, weightKg: 77.5, rpe: 9 },
    { reps: 8, weightKg: 77.5, rpe: 9 },
  ],
  "lat-pulldown": [
    { reps: 12, weightKg: 55, rpe: 8 },
    { reps: 12, weightKg: 55, rpe: 8 },
    { reps: 10, weightKg: 60, rpe: 9 },
  ],
  "incline-bench-press": [
    { reps: 8, weightKg: 70, rpe: 8 },
    { reps: 8, weightKg: 70, rpe: 8 },
    { reps: 6, weightKg: 75, rpe: 9 },
  ],
  "machine-fly": [
    { reps: 15, weightKg: 40, rpe: 8 },
    { reps: 12, weightKg: 45, rpe: 9 },
    { reps: 12, weightKg: 45, rpe: 9 },
  ],
  "overhead-press": [
    { reps: 8, weightKg: 42.5, rpe: 8 },
    { reps: 8, weightKg: 42.5, rpe: 8 },
    { reps: 6, weightKg: 45, rpe: 9 },
  ],
  "lateral-raise": [
    { reps: 15, weightKg: 10, rpe: 8 },
    { reps: 15, weightKg: 10, rpe: 8 },
    { reps: 12, weightKg: 12, rpe: 9 },
  ],
  "back-squat": [
    { reps: 6, weightKg: 110, rpe: 8 },
    { reps: 6, weightKg: 110, rpe: 8 },
    { reps: 5, weightKg: 120, rpe: 9 },
  ],
  "romanian-deadlift": [
    { reps: 8, weightKg: 90, rpe: 8 },
    { reps: 8, weightKg: 90, rpe: 8 },
    { reps: 8, weightKg: 95, rpe: 9 },
  ],
  "leg-press": [
    { reps: 12, weightKg: 220, rpe: 8 },
    { reps: 12, weightKg: 220, rpe: 8 },
    { reps: 10, weightKg: 240, rpe: 9 },
  ],
  "hip-thrust": [
    { reps: 10, weightKg: 120, rpe: 8 },
    { reps: 10, weightKg: 120, rpe: 8 },
    { reps: 8, weightKg: 130, rpe: 9 },
  ],
  "barbell-curl": [
    { reps: 12, weightKg: 30, rpe: 8 },
    { reps: 12, weightKg: 30, rpe: 8 },
    { reps: 10, weightKg: 35, rpe: 9 },
  ],
  "rope-pushdown": [
    { reps: 15, weightKg: 25, rpe: 8 },
    { reps: 12, weightKg: 30, rpe: 9 },
    { reps: 12, weightKg: 30, rpe: 9 },
  ],
  "heavy-bag-rounds": [{ rpe: 8 }, { rpe: 8 }, { rpe: 9 }, { rpe: 9 }, { rpe: 9 }],
};

const defaultRecoveryInputs: TrainingRecoveryInputs = {
  sleepHours: 7.5,
  carbsTargetRatio: 0.9,
  hydrationTargetRatio: 0.85,
};

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function buildTemplateEntry(slug: string, sequenceIndex: number, notes?: string) {
  const setTargets = (defaultSetPresets[slug] ?? [{ reps: 10, weightKg: 40, rpe: 8 }]).map(
    (set, setIndex) => ({
      setIndex: setIndex + 1,
      targetRepsMin: set.reps,
      targetRepsMax: set.reps,
      targetWeightKg: set.weightKg,
      targetDurationSeconds: slug === "heavy-bag-rounds" ? 180 : undefined,
      targetRpe: set.rpe,
    }),
  );

  return {
    exerciseSlug: slug,
    sequenceIndex,
    targetSets: setTargets.length,
    targetRepsMin: setTargets[0]?.targetRepsMin,
    targetRepsMax: setTargets[0]?.targetRepsMax,
    targetWeightKg: setTargets[0]?.targetWeightKg,
    targetDurationSeconds: slug === "heavy-bag-rounds" ? 180 : undefined,
    targetRpe: setTargets[0]?.targetRpe,
    stimulusVector: trainingExerciseCatalog.find((exercise) => exercise.slug === slug)?.stimulusVector,
    notes,
    setTargets,
  };
}

export const trainingTemplates: TrainingTemplateBlueprint[] = [
  {
    id: "pull-density",
    name: "Pull densidad",
    description: "Espalda pesada con mucho tonelaje y trabajo accesorio de biceps.",
    sessionKind: "strength",
    goal: "densidad y traccion horizontal",
    entries: [
      buildTemplateEntry("barbell-row", 0, "Back-off pesado para dorsal y trapecio."),
      buildTemplateEntry("lat-pulldown", 1, "Compensa con amplitud y rango completo."),
      buildTemplateEntry("barbell-curl", 2, "Cierra con accesorio de biceps."),
    ],
  },
  {
    id: "push-hypertrophy",
    name: "Push hipertrofia",
    description: "Pecho y hombro con mezcla de fuerza base y trabajo de amplitud.",
    sessionKind: "strength",
    goal: "empuje y volumen de torso",
    entries: [
      buildTemplateEntry("incline-bench-press", 0),
      buildTemplateEntry("machine-fly", 1),
      buildTemplateEntry("lateral-raise", 2),
      buildTemplateEntry("rope-pushdown", 3),
    ],
  },
  {
    id: "legs-strength",
    name: "Legs fuerza",
    description: "Pierna dominante en cuadriceps y cadena posterior.",
    sessionKind: "strength",
    goal: "fuerza base y cadena posterior",
    entries: [
      buildTemplateEntry("back-squat", 0),
      buildTemplateEntry("romanian-deadlift", 1),
      buildTemplateEntry("leg-press", 2),
      buildTemplateEntry("hip-thrust", 3),
    ],
  },
  {
    id: "boxing-cardio",
    name: "Boxing cardio",
    description: "Rounds metabolicos con foco en capacidad de trabajo y descarga neural de fuerza estricta.",
    sessionKind: "conditioning",
    goal: "acondicionamiento y rounds de saco",
    entries: [
      buildTemplateEntry("heavy-bag-rounds", 0, "5 rounds de 3 minutos con 60 segundos de pausa."),
    ],
  },
];

export const trainingProtocols: TrainingProtocolBlueprint[] = [
  {
    id: "strength-density-6w",
    name: "Bloque Fuerza-Densidad",
    description: "Mesociclo de 6 semanas que mezcla fuerza estricta con rounds metabolicos sin romper recuperacion.",
    goal: "densidad, fuerza base y acondicionamiento controlado",
    durationWeeks: 6,
    weeks: [
      {
        weekNumber: 1,
        label: "Base tecnica",
        weekType: "build",
        loadFactor: 0.94,
        rpeOffset: -0.5,
        templates: [
          { templateId: "pull-density", dayOffset: 0, orderIndex: 0, progressionPercent: 0, targetRpeDelta: -0.5 },
          { templateId: "push-hypertrophy", dayOffset: 2, orderIndex: 0, progressionPercent: 0, targetRpeDelta: -0.5 },
          { templateId: "boxing-cardio", dayOffset: 4, orderIndex: 0, progressionPercent: 0, targetRpeDelta: 0 },
          { templateId: "legs-strength", dayOffset: 5, orderIndex: 0, progressionPercent: 0, targetRpeDelta: -0.5 },
        ],
      },
      {
        weekNumber: 2,
        label: "Acumulacion",
        weekType: "build",
        loadFactor: 1,
        rpeOffset: 0,
        templates: [
          { templateId: "pull-density", dayOffset: 0, orderIndex: 0, progressionPercent: 2.5, targetRpeDelta: 0 },
          { templateId: "push-hypertrophy", dayOffset: 2, orderIndex: 0, progressionPercent: 2.5, targetRpeDelta: 0 },
          { templateId: "boxing-cardio", dayOffset: 4, orderIndex: 0, progressionPercent: 0, targetRpeDelta: 0.2 },
          { templateId: "legs-strength", dayOffset: 5, orderIndex: 0, progressionPercent: 2.5, targetRpeDelta: 0 },
        ],
      },
      {
        weekNumber: 3,
        label: "Densidad alta",
        weekType: "intensification",
        loadFactor: 1.04,
        rpeOffset: 0.5,
        templates: [
          { templateId: "pull-density", dayOffset: 0, orderIndex: 0, progressionPercent: 5, targetRpeDelta: 0.5 },
          { templateId: "push-hypertrophy", dayOffset: 2, orderIndex: 0, progressionPercent: 5, targetRpeDelta: 0.5 },
          { templateId: "boxing-cardio", dayOffset: 4, orderIndex: 0, progressionPercent: 0, targetRpeDelta: 0.5 },
          { templateId: "legs-strength", dayOffset: 5, orderIndex: 0, progressionPercent: 5, targetRpeDelta: 0.5 },
        ],
      },
      {
        weekNumber: 4,
        label: "Pico controlado",
        weekType: "intensification",
        loadFactor: 1.08,
        rpeOffset: 1,
        templates: [
          { templateId: "pull-density", dayOffset: 0, orderIndex: 0, progressionPercent: 7.5, targetRpeDelta: 1 },
          { templateId: "push-hypertrophy", dayOffset: 2, orderIndex: 0, progressionPercent: 7.5, targetRpeDelta: 1 },
          { templateId: "boxing-cardio", dayOffset: 4, orderIndex: 0, progressionPercent: 0, targetRpeDelta: 0.5 },
          { templateId: "legs-strength", dayOffset: 5, orderIndex: 0, progressionPercent: 7.5, targetRpeDelta: 1 },
        ],
      },
      {
        weekNumber: 5,
        label: "Descarga",
        weekType: "deload",
        loadFactor: 0.72,
        rpeOffset: -1.5,
        notes: "Baja volumen y quita sets cercanos al fallo.",
        templates: [
          { templateId: "pull-density", dayOffset: 0, orderIndex: 0, progressionPercent: -10, targetRpeDelta: -1.5 },
          { templateId: "push-hypertrophy", dayOffset: 2, orderIndex: 0, progressionPercent: -10, targetRpeDelta: -1.5 },
          { templateId: "boxing-cardio", dayOffset: 4, orderIndex: 0, progressionPercent: -15, targetRpeDelta: -1 },
          { templateId: "legs-strength", dayOffset: 5, orderIndex: 0, progressionPercent: -10, targetRpeDelta: -1.5 },
        ],
      },
      {
        weekNumber: 6,
        label: "Reaceleracion",
        weekType: "test",
        loadFactor: 1.02,
        rpeOffset: 0.5,
        templates: [
          { templateId: "pull-density", dayOffset: 0, orderIndex: 0, progressionPercent: 4, targetRpeDelta: 0.5 },
          { templateId: "push-hypertrophy", dayOffset: 2, orderIndex: 0, progressionPercent: 4, targetRpeDelta: 0.5 },
          { templateId: "boxing-cardio", dayOffset: 4, orderIndex: 0, progressionPercent: 2, targetRpeDelta: 0.2 },
          { templateId: "legs-strength", dayOffset: 5, orderIndex: 0, progressionPercent: 4, targetRpeDelta: 0.5 },
        ],
      },
    ],
  },
];

export function createEntryFromCatalog(slug: string) {
  const exercise = trainingExerciseCatalog.find((item) => item.slug === slug);

  if (!exercise) {
    throw new Error(`No existe el ejercicio ${slug} en el catalogo de musculacion.`);
  }

  return {
    ...exercise,
    sets: defaultSetPresets[exercise.slug] ?? [{ reps: 10, weightKg: 40, rpe: 8 }],
  };
}

export function createTrainingTemplateSession(templateId: string): TrainingSessionDraft {
  const template = trainingTemplates.find((item) => item.id === templateId);

  if (!template) {
    throw new Error(`No existe el template ${templateId}.`);
  }

  return {
    title: template.name,
    notes: template.description,
    recoveryInputs: defaultRecoveryInputs,
    entries: template.entries.map((entry) => {
      if (!entry.exerciseSlug) {
        throw new Error(`El template ${templateId} tiene una entrada sin exerciseSlug.`);
      }

      return createEntryFromCatalog(entry.exerciseSlug);
    }),
  };
}

function buildTrainingSummary(session: TrainingSessionDraft): TrainingSessionSummary {
  let compoundSets = 0;
  let totalSets = 0;
  let totalReps = 0;
  let totalLoadKg = 0;
  let totalDurationMinutes = 0;
  let peakRpe = 0;
  let rpeSamples = 0;
  let rpeAccumulator = 0;

  session.entries.forEach((entry) => {
    if (entry.isCompound) {
      compoundSets += entry.sets.length;
    }

    entry.sets.forEach((set) => {
      totalSets += 1;
      totalReps += set.reps ?? 0;
      totalLoadKg += (set.reps ?? 0) * (set.weightKg ?? 0);
      totalDurationMinutes += set.durationMinutes ?? 0;

      if (set.rpe) {
        peakRpe = Math.max(peakRpe, set.rpe);
        rpeAccumulator += set.rpe;
        rpeSamples += 1;
      }
    });
  });

  const effectiveMinutes = totalDurationMinutes || totalSets * 3;

  return {
    entryCount: session.entries.length,
    totalSets,
    totalReps,
    totalLoadKg: roundToOneDecimal(totalLoadKg),
    totalDurationMinutes,
    boxingRounds: 0,
    peakRpe,
    compoundSets,
    averageRpe: rpeSamples > 0 ? roundToOneDecimal(rpeAccumulator / rpeSamples) : 0,
    densityScore: roundToOneDecimal(totalLoadKg / Math.max(effectiveMinutes, 1)),
  };
}

function buildMuscleLoad(session: TrainingSessionDraft): MuscleLoadSummary[] {
  const grouped = new Map<MuscleGroupSlug, Omit<MuscleLoadSummary, "muscle" | "label" | "category" | "tone"> & { rpeSamples: number }>();

  session.entries.forEach((entry) => {
    const current = grouped.get(entry.primaryMuscle) ?? {
      totalSets: 0,
      totalReps: 0,
      totalLoadKg: 0,
      averageRpe: 0,
      recoveryTimeHours: entry.recoveryTimeHours,
      fatigueIndex: 0,
      rpeSamples: 0,
    };

    entry.sets.forEach((set) => {
      current.totalSets += 1;
      current.totalReps += set.reps ?? 0;
      current.totalLoadKg += (set.reps ?? 0) * (set.weightKg ?? 0);

      if (set.rpe) {
        current.averageRpe += set.rpe;
        current.rpeSamples += 1;
      }
    });

    current.recoveryTimeHours = Math.max(current.recoveryTimeHours, entry.recoveryTimeHours);
    grouped.set(entry.primaryMuscle, current);
  });

  return Array.from(grouped.entries())
    .map(([muscle, values]) => {
      const averageRpe = values.rpeSamples > 0 ? values.averageRpe / values.rpeSamples : 0;
      const fatigueIndex = roundToOneDecimal(
        values.totalSets * 4 + values.totalLoadKg / 120 + averageRpe * 1.5,
      );
      const tone = fatigueIndex >= 55 ? "high" : fatigueIndex >= 28 ? "moderate" : "low";

      return {
        muscle,
        label: muscleMetadata[muscle].label,
        category: muscleMetadata[muscle].category,
        totalSets: values.totalSets,
        totalReps: values.totalReps,
        totalLoadKg: roundToOneDecimal(values.totalLoadKg),
        averageRpe: roundToOneDecimal(averageRpe),
        recoveryTimeHours: values.recoveryTimeHours,
        fatigueIndex,
        tone,
      } satisfies MuscleLoadSummary;
    })
    .sort((left, right) => right.fatigueIndex - left.fatigueIndex);
}

function buildStimulusBalance(session: TrainingSessionDraft): StimulusBalanceSlice[] {
  const grouped = new Map<TrainingExerciseCatalogItem["stimulusVector"], { totalSets: number; totalLoadKg: number }>();

  session.entries.forEach((entry) => {
    const current = grouped.get(entry.stimulusVector) ?? { totalSets: 0, totalLoadKg: 0 };

    entry.sets.forEach((set) => {
      current.totalSets += 1;
      current.totalLoadKg += (set.reps ?? 0) * (set.weightKg ?? 0);
    });

    grouped.set(entry.stimulusVector, current);
  });

  return Array.from(grouped.entries()).map(([stimulusVector, values]) => ({
    stimulusVector,
    totalSets: values.totalSets,
    totalLoadKg: roundToOneDecimal(values.totalLoadKg),
  }));
}

function buildRecommendations(
  summary: TrainingSessionSummary,
  muscleLoad: MuscleLoadSummary[],
  stimulusBalance: StimulusBalanceSlice[],
) {
  const recommendations: string[] = [];
  const dominantStimulus = [...stimulusBalance].sort((left, right) => right.totalSets - left.totalSets)[0];

  if (summary.compoundSets >= 9 && summary.averageRpe >= 8.3) {
    recommendations.push(
      "La sesion acumula bastante fatiga neural. Si repetis un dia pesado mañana, baja una serie compuesta o el RPE objetivo.",
    );
  }

  if (dominantStimulus && dominantStimulus.totalSets / Math.max(summary.totalSets, 1) >= 0.6) {
    recommendations.push(
      `Predomina el vector ${dominantStimulus.stimulusVector}. La proxima sesion conviene compensarla con otro estimulo para no sesgar el bloque.`,
    );
  }

  const topMuscle = muscleLoad[0];

  if (topMuscle && topMuscle.fatigueIndex >= 55) {
    recommendations.push(
      `${topMuscle.label} queda como cuello de botella. Dale al menos ${topMuscle.recoveryTimeHours} horas antes de volver a cargarlo fuerte.`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "La distribucion de la sesion esta bastante balanceada. Podes progresar con una microcarga y sostener el mismo split.",
    );
  }

  return recommendations;
}

export function summarizeWorkoutIntake(payload: WorkoutIntakePayload): WorkoutSummary {
  return payload.reduce<WorkoutSummary>(
    (summary, entry) => {
      const reps = entry.reps ?? 0;
      const weightKg = entry.weightKg ?? 0;
      const durationMinutes = entry.durationMinutes ?? 0;

      summary.entryCount += 1;
      summary.totalSets += entry.sets;
      summary.totalReps += entry.sets * reps;
      summary.totalLoadKg += entry.sets * reps * weightKg;
      summary.totalDurationMinutes += entry.sets * durationMinutes;
      summary.boxingRounds += durationMinutes > 0 ? entry.sets : 0;
      summary.peakRpe = Math.max(summary.peakRpe, entry.rpe ?? 0);

      return summary;
    },
    {
      entryCount: 0,
      totalSets: 0,
      totalReps: 0,
      totalLoadKg: 0,
      totalDurationMinutes: 0,
      boxingRounds: 0,
      peakRpe: 0,
    },
  );
}

export function analyzeTrainingSession(session: TrainingSessionDraft): TrainingSessionAnalysis {
  const summary = buildTrainingSummary(session);
  const muscleLoad = buildMuscleLoad(session);
  const stimulusBalance = buildStimulusBalance(session);

  const readiness = calculateReadinessScore({
    localFatigue: muscleLoad.map((muscle) => ({
      recoveryTimeHours: muscle.recoveryTimeHours,
      hoursSinceStimulus: 0,
      loadScore: muscle.totalLoadKg + muscle.totalSets * 120,
    })),
    centralFatigue: {
      compoundHighRpeCount: session.entries.filter(
        (entry) => entry.isCompound && entry.sets.some((set) => (set.rpe ?? 0) >= 8),
      ).length,
      boxingRounds: 0,
    },
    recoveryInputs: session.recoveryInputs,
  });

  return {
    summary,
    readiness,
    muscleLoad,
    stimulusBalance,
    recommendations: buildRecommendations(summary, muscleLoad, stimulusBalance),
  };
}

export function compressTrainingSessionToWorkoutIntakePayload(
  session: TrainingSessionDraft,
): WorkoutIntakePayload {
  return session.entries.map((entry) => {
    const averageReps =
      entry.sets.reduce((total, set) => total + (set.reps ?? 0), 0) / Math.max(entry.sets.length, 1);
    const averageWeight =
      entry.sets.reduce((total, set) => total + (set.weightKg ?? 0), 0) /
      Math.max(entry.sets.length, 1);
    const averageRpe =
      entry.sets.reduce((total, set) => total + (set.rpe ?? 0), 0) / Math.max(entry.sets.length, 1);

    return {
      exerciseName: entry.name,
      source: "manual",
      sets: entry.sets.length,
      reps: averageReps > 0 ? Math.round(averageReps) : undefined,
      weightKg: averageWeight > 0 ? roundToOneDecimal(averageWeight) : undefined,
      rpe: averageRpe > 0 ? Math.round(averageRpe) : undefined,
      stimulusVector: entry.stimulusVector,
    } satisfies WorkoutIntakeEntry;
  });
}