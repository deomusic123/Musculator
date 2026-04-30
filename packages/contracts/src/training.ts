import { z } from "zod";

export const workoutSourceSchema = z.enum(["manual", "text", "audio", "vision", "import"]);
export const stimulusVectorSchema = z.enum([
  "amplitud",
  "densidad",
  "fuerza",
  "cardio_metabolico",
  "acondicionamiento",
  "potencia",
]);

export const movementPatternSchema = z.enum([
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
]);

export const resistanceProfileSchema = z.enum([
  "bodyweight",
  "free_weight",
  "cable",
  "machine_constant",
  "machine_variable",
]);

export const workoutIntakeEntrySchema = z.object({
  exerciseName: z.string().min(2),
  source: workoutSourceSchema,
  sets: z.number().int().positive(),
  reps: z.number().int().positive().optional(),
  weightKg: z.number().positive().optional(),
  durationMinutes: z.number().positive().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  stimulusVector: stimulusVectorSchema.optional(),
});

export const workoutIntakePayloadSchema = z.array(workoutIntakeEntrySchema).min(1);

export const workoutSummarySchema = z.object({
  entryCount: z.number().int().min(0),
  totalSets: z.number().int().min(0),
  totalReps: z.number().int().min(0),
  totalLoadKg: z.number().min(0),
  totalDurationMinutes: z.number().min(0),
  boxingRounds: z.number().int().min(0),
  peakRpe: z.number().int().min(0).max(10),
});

export const muscleGroupSlugSchema = z.enum([
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
]);

export const trainingRecoveryInputsSchema = z.object({
  sleepHours: z.number().min(0).max(12),
  carbsTargetRatio: z.number().min(0).max(1.5),
  hydrationTargetRatio: z.number().min(0).max(1.5),
});

export const clientProfileSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(2).max(80),
  goal: z.string().max(160).optional(),
  notes: z.string().max(240).optional(),
  createdAt: z.string().datetime(),
});

export const clientProfileCreateSchema = z.object({
  fullName: z.string().min(2).max(80),
  goal: z.string().max(160).optional(),
  notes: z.string().max(240).optional(),
});

export const clientListResponseSchema = z.object({
  status: z.enum(["connected", "preview"]),
  storage: z.enum(["supabase", "noop"]),
  clients: z.array(clientProfileSchema),
});

export const clientCreateResponseSchema = z.object({
  status: z.enum(["created", "preview"]),
  storage: z.enum(["supabase", "noop"]),
  client: clientProfileSchema.optional(),
});

export const trainingTemplateSessionKindSchema = z.enum([
  "strength",
  "conditioning",
  "hybrid",
]);

export const trainingProtocolWeekTypeSchema = z.enum([
  "build",
  "intensification",
  "deload",
  "test",
]);

export const trainingProtocolAssignmentStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
]);

export const trainingTemplateSetTargetSchema = z.object({
  setIndex: z.number().int().positive(),
  targetRepsMin: z.number().int().positive().optional(),
  targetRepsMax: z.number().int().positive().optional(),
  targetWeightKg: z.number().nonnegative().optional(),
  targetDurationSeconds: z.number().int().positive().optional(),
  targetRpe: z.number().min(1).max(10).optional(),
  notes: z.string().max(240).optional(),
});

export const trainingTemplateExerciseSchema = z.object({
  exerciseSlug: z.string().min(2).max(80).optional(),
  rawExerciseName: z.string().min(2).max(120).optional(),
  sequenceIndex: z.number().int().min(0),
  targetSets: z.number().int().positive(),
  targetRepsMin: z.number().int().positive().optional(),
  targetRepsMax: z.number().int().positive().optional(),
  targetWeightKg: z.number().nonnegative().optional(),
  targetDurationSeconds: z.number().int().positive().optional(),
  targetRpe: z.number().min(1).max(10).optional(),
  stimulusVector: stimulusVectorSchema.optional(),
  notes: z.string().max(240).optional(),
  setTargets: z.array(trainingTemplateSetTargetSchema),
}).refine((value) => value.exerciseSlug || value.rawExerciseName, {
  message: "Cada ejercicio del template necesita exerciseSlug o rawExerciseName.",
  path: ["exerciseSlug"],
});

export const trainingTemplateBlueprintSchema = z.object({
  id: z.string().min(2).max(80),
  name: z.string().min(2).max(120),
  description: z.string().max(240),
  sessionKind: trainingTemplateSessionKindSchema,
  goal: z.string().max(160).optional(),
  entries: z.array(trainingTemplateExerciseSchema).min(1),
});

export const trainingProtocolWeekTemplateSchema = z.object({
  templateId: z.string().min(2).max(80),
  dayOffset: z.number().int().min(0).max(6),
  orderIndex: z.number().int().min(0).default(0),
  progressionPercent: z.number().min(-100).max(300).default(0),
  targetRpeDelta: z.number().min(-3).max(3).default(0),
  notes: z.string().max(240).optional(),
});

export const trainingProtocolWeekSchema = z.object({
  weekNumber: z.number().int().positive(),
  label: z.string().min(2).max(80),
  weekType: trainingProtocolWeekTypeSchema,
  loadFactor: z.number().min(0.4).max(1.8),
  rpeOffset: z.number().min(-3).max(3),
  notes: z.string().max(240).optional(),
  templates: z.array(trainingProtocolWeekTemplateSchema).min(1),
});

export const trainingProtocolBlueprintSchema = z.object({
  id: z.string().min(2).max(80),
  name: z.string().min(2).max(120),
  description: z.string().max(240),
  goal: z.string().max(160).optional(),
  durationWeeks: z.number().int().positive(),
  weeks: z.array(trainingProtocolWeekSchema).min(1),
});

export const clientProtocolAssignmentSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  protocolId: z.string().min(2).max(80),
  status: trainingProtocolAssignmentStatusSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  activeWeek: z.number().int().positive(),
  currentDayOffset: z.number().int().min(0).max(6),
});

export const trainingExerciseCatalogItemSchema = z.object({
  slug: z.string().min(2),
  name: z.string().min(2),
  category: z.string().min(2),
  movementPattern: movementPatternSchema,
  primaryMuscle: muscleGroupSlugSchema,
  secondaryMuscles: z.array(muscleGroupSlugSchema),
  stimulusVector: stimulusVectorSchema,
  resistanceProfile: resistanceProfileSchema,
  isCompound: z.boolean(),
  equipment: z.string().min(1),
  cnsTaxMultiplier: z.number().min(1).max(10),
  recoveryTimeHours: z.number().int().positive(),
});

export const workoutDraftSetSchema = z.object({
  reps: z.number().int().positive().optional(),
  weightKg: z.number().nonnegative().optional(),
  durationMinutes: z.number().positive().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
});

export const trainingSessionEntrySchema = trainingExerciseCatalogItemSchema.extend({
  sets: z.array(workoutDraftSetSchema).min(1),
  notes: z.string().max(240).optional(),
});

export const trainingSessionDraftSchema = z.object({
  title: z.string().min(2).max(80),
  notes: z.string().max(240).optional(),
  entries: z.array(trainingSessionEntrySchema).min(1),
  recoveryInputs: trainingRecoveryInputsSchema,
});

export const trainingSessionSummarySchema = workoutSummarySchema.extend({
  compoundSets: z.number().int().min(0),
  averageRpe: z.number().min(0).max(10),
  densityScore: z.number().min(0),
});

export const muscleLoadSummarySchema = z.object({
  muscle: muscleGroupSlugSchema,
  label: z.string().min(2),
  category: z.string().min(2),
  totalSets: z.number().int().min(0),
  totalReps: z.number().int().min(0),
  totalLoadKg: z.number().min(0),
  averageRpe: z.number().min(0).max(10),
  recoveryTimeHours: z.number().int().positive(),
  fatigueIndex: z.number().min(0),
  tone: z.enum(["low", "moderate", "high"]),
});

export const stimulusBalanceSliceSchema = z.object({
  stimulusVector: stimulusVectorSchema,
  totalSets: z.number().int().min(0),
  totalLoadKg: z.number().min(0),
});

export const readinessBreakdownSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.enum(["green", "amber", "red"]),
  localPenalty: z.number().min(0),
  centralPenalty: z.number().min(0),
  recoveryBonus: z.number().min(0),
});

export const trainingSessionAnalysisSchema = z.object({
  summary: trainingSessionSummarySchema,
  readiness: readinessBreakdownSchema,
  muscleLoad: z.array(muscleLoadSummarySchema).min(1),
  stimulusBalance: z.array(stimulusBalanceSliceSchema).min(1),
  recommendations: z.array(z.string()),
});

export const persistedTrainingSessionTopMuscleSchema = z.object({
  muscleSlug: z.string().min(1),
  muscleName: z.string().min(1),
  totalSets: z.number().int().min(0),
  totalLoadKg: z.number().min(0),
});

export const persistedTrainingSessionSummarySchema = z.object({
  sessionId: z.string().uuid(),
  title: z.string().min(1),
  startedAt: z.string().datetime(),
  totalSets: z.number().int().min(0),
  totalLoadKg: z.number().min(0),
  peakRpe: z.number().int().min(0).max(10),
  averageRpe: z.number().min(0).max(10),
  topMuscles: z.array(persistedTrainingSessionTopMuscleSchema).max(3),
});

export const trainingSessionSaveResponseSchema = z.object({
  status: z.enum(["saved", "preview"]),
  storage: z.enum(["supabase", "noop"]),
  sessionId: z.string().uuid().optional(),
  savedAt: z.string().datetime().optional(),
  analysis: trainingSessionAnalysisSchema,
});

export const trainingHistoryResponseSchema = z.object({
  status: z.enum(["connected", "preview"]),
  storage: z.enum(["supabase", "noop"]),
  sessions: z.array(persistedTrainingSessionSummarySchema),
});

export const biomechanicalRadarAxisSchema = z.object({
  key: z.enum([
    "verticalPull",
    "horizontalPull",
    "push",
    "posteriorChain",
    "conditioning",
  ]),
  label: z.string().min(2),
  actualPercent: z.number().min(0).max(100),
  targetPercent: z.number().min(0).max(100),
  gapPercent: z.number().min(-100).max(100),
});

export const profileStimulusBalanceSliceSchema = z.object({
  stimulusVector: stimulusVectorSchema,
  actualSets: z.number().int().min(0),
  targetSets: z.number().min(0),
  actualLoadKg: z.number().min(0),
});

export const clientProfileAnalyticsSchema = z.object({
  clientId: z.string().uuid(),
  readiness: readinessBreakdownSchema,
  weeklyNeuralCost: z.number().min(0),
  weeklyNeuralTarget: z.number().min(0),
  weeklyNeuralDelta: z.number(),
  recoveryGapHours: z.number().min(0),
  nutritionRecoveryGap: z.number().min(0),
  nutritionSupportRatio: z.number().min(0),
  targetSupportRatio: z.number().min(0),
  radarAxes: z.array(biomechanicalRadarAxisSchema).length(5),
  stimulusBalance: z.array(profileStimulusBalanceSliceSchema).min(1),
  referenceTemplateName: z.string().min(1).optional(),
  referenceProtocolName: z.string().min(1).optional(),
});

export const clientProfileAnalyticsResponseSchema = z.object({
  status: z.enum(["connected", "preview"]),
  storage: z.enum(["supabase", "noop"]),
  analytics: clientProfileAnalyticsSchema,
});

export const trainingIngestionRequestSchema = z.object({
  source: workoutSourceSchema,
  rawInput: z.string().min(1).max(5000),
  parsedPayload: workoutIntakePayloadSchema.optional(),
  sessionStartedAt: z.string().datetime().optional(),
});

export const trainingIngestionResponseSchema = z.object({
  status: z.enum(["accepted", "preview"]),
  storage: z.enum(["supabase", "noop"]),
  n8nForwarded: z.boolean(),
  summary: workoutSummarySchema,
});

export type WorkoutSource = z.infer<typeof workoutSourceSchema>;
export type StimulusVector = z.infer<typeof stimulusVectorSchema>;
export type MovementPattern = z.infer<typeof movementPatternSchema>;
export type ResistanceProfile = z.infer<typeof resistanceProfileSchema>;
export type WorkoutIntakeEntry = z.infer<typeof workoutIntakeEntrySchema>;
export type WorkoutIntakePayload = z.infer<typeof workoutIntakePayloadSchema>;
export type WorkoutSummary = z.infer<typeof workoutSummarySchema>;
export type MuscleGroupSlug = z.infer<typeof muscleGroupSlugSchema>;
export type TrainingRecoveryInputs = z.infer<typeof trainingRecoveryInputsSchema>;
export type ClientProfile = z.infer<typeof clientProfileSchema>;
export type ClientProfileCreate = z.infer<typeof clientProfileCreateSchema>;
export type ClientListResponse = z.infer<typeof clientListResponseSchema>;
export type ClientCreateResponse = z.infer<typeof clientCreateResponseSchema>;
export type TrainingTemplateSessionKind = z.infer<typeof trainingTemplateSessionKindSchema>;
export type TrainingProtocolWeekType = z.infer<typeof trainingProtocolWeekTypeSchema>;
export type TrainingProtocolAssignmentStatus = z.infer<
  typeof trainingProtocolAssignmentStatusSchema
>;
export type TrainingTemplateSetTarget = z.infer<typeof trainingTemplateSetTargetSchema>;
export type TrainingTemplateExercise = z.infer<typeof trainingTemplateExerciseSchema>;
export type TrainingTemplateBlueprint = z.infer<typeof trainingTemplateBlueprintSchema>;
export type TrainingProtocolWeekTemplate = z.infer<typeof trainingProtocolWeekTemplateSchema>;
export type TrainingProtocolWeek = z.infer<typeof trainingProtocolWeekSchema>;
export type TrainingProtocolBlueprint = z.infer<typeof trainingProtocolBlueprintSchema>;
export type ClientProtocolAssignment = z.infer<typeof clientProtocolAssignmentSchema>;
export type TrainingExerciseCatalogItem = z.infer<typeof trainingExerciseCatalogItemSchema>;
export type WorkoutDraftSet = z.infer<typeof workoutDraftSetSchema>;
export type TrainingSessionEntry = z.infer<typeof trainingSessionEntrySchema>;
export type TrainingSessionDraft = z.infer<typeof trainingSessionDraftSchema>;
export type TrainingSessionSummary = z.infer<typeof trainingSessionSummarySchema>;
export type MuscleLoadSummary = z.infer<typeof muscleLoadSummarySchema>;
export type StimulusBalanceSlice = z.infer<typeof stimulusBalanceSliceSchema>;
export type ReadinessBreakdown = z.infer<typeof readinessBreakdownSchema>;
export type TrainingSessionAnalysis = z.infer<typeof trainingSessionAnalysisSchema>;
export type PersistedTrainingSessionTopMuscle = z.infer<
  typeof persistedTrainingSessionTopMuscleSchema
>;
export type PersistedTrainingSessionSummary = z.infer<
  typeof persistedTrainingSessionSummarySchema
>;
export type TrainingSessionSaveResponse = z.infer<typeof trainingSessionSaveResponseSchema>;
export type TrainingHistoryResponse = z.infer<typeof trainingHistoryResponseSchema>;
export type BiomechanicalRadarAxis = z.infer<typeof biomechanicalRadarAxisSchema>;
export type ProfileStimulusBalanceSlice = z.infer<typeof profileStimulusBalanceSliceSchema>;
export type ClientProfileAnalytics = z.infer<typeof clientProfileAnalyticsSchema>;
export type ClientProfileAnalyticsResponse = z.infer<typeof clientProfileAnalyticsResponseSchema>;
export type TrainingIngestionRequest = z.infer<typeof trainingIngestionRequestSchema>;
export type TrainingIngestionResponse = z.infer<typeof trainingIngestionResponseSchema>;
