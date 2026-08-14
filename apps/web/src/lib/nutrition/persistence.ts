import { createAdminSupabaseClient, getTrainingPersistenceContext } from "../platform/supabase-admin";

export type NutritionMealSlot =
  | "desayuno"
  | "almuerzo"
  | "pre_entreno"
  | "post_entreno"
  | "cena"
  | "snack";

export interface NutritionMacroTargets {
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  waterMl: number;
}

export interface NutritionMealEntry {
  id: string;
  slot: NutritionMealSlot;
  name: string;
  time: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  hydrationMl: number;
  notes?: string | undefined;
}

export interface NutritionDayLog {
  targets: NutritionMacroTargets;
  extraWaterMl: number;
  meals: NutritionMealEntry[];
}

export interface NutritionDayResponse {
  status: "connected" | "preview";
  storage: "supabase" | "noop";
  dayLog: NutritionDayLog;
}

interface ClientOwnershipRow {
  id: string;
}

interface NutritionTargetRow {
  kcal_target: number;
  protein_target: number;
  carbs_target: number;
  fats_target: number;
  water_target_ml: number;
  extra_water_ml: number;
}

interface NutritionMealRow {
  id: string;
  meal_slot: string | null;
  meal_name: string | null;
  notes: string | null;
  eaten_at: string;
  kcal: number | null;
  protein_g: number | string | null;
  carbs_g: number | string | null;
  fats_g: number | string | null;
  hydration_ml: number | null;
}

const validMealSlots = new Set<NutritionMealSlot>([
  "desayuno",
  "almuerzo",
  "pre_entreno",
  "post_entreno",
  "cena",
  "snack",
]);

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

function normalizeMealSlot(value: string | null | undefined): NutritionMealSlot {
  if (value && validMealSlots.has(value as NutritionMealSlot)) {
    return value as NutritionMealSlot;
  }

  return "snack";
}

function buildDayLog(defaultTargets?: NutritionMacroTargets): NutritionDayLog {
  return {
    targets: {
      kcal: defaultTargets?.kcal ?? 0,
      protein: defaultTargets?.protein ?? 0,
      carbs: defaultTargets?.carbs ?? 0,
      fats: defaultTargets?.fats ?? 0,
      waterMl: defaultTargets?.waterMl ?? 0,
    },
    extraWaterMl: 0,
    meals: [],
  };
}

function parseDateKey(dateKey: string) {
  const normalized = dateKey.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("Formato de fecha invalido. Usa YYYY-MM-DD.");
  }
  return normalized;
}

function toUtcRange(dateKey: string) {
  const parsedDate = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("No se pudo interpretar la fecha de nutricion.");
  }

  const endDate = new Date(parsedDate);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  return {
    startIso: parsedDate.toISOString(),
    endIso: endDate.toISOString(),
  };
}

async function ensureOwnedClient(clientId: string, userId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = (await admin
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("owner_user_id", userId)
    .single()) as { data: ClientOwnershipRow | null; error: { message: string } | null };

  if (error || !data) {
    throw new Error(error?.message ?? "El cliente seleccionado no existe.");
  }
}

function mapMealRow(row: NutritionMealRow): NutritionMealEntry {
  const eatenAtIso = new Date(row.eaten_at).toISOString();
  const mealName = row.meal_name?.trim();

  return {
    id: row.id,
    slot: normalizeMealSlot(row.meal_slot),
    name: mealName && mealName.length > 0 ? mealName : "Comida",
    time: eatenAtIso.slice(11, 16),
    kcal: Math.max(Math.round(toNumber(row.kcal)), 0),
    protein: Math.max(Math.round(toNumber(row.protein_g)), 0),
    carbs: Math.max(Math.round(toNumber(row.carbs_g)), 0),
    fats: Math.max(Math.round(toNumber(row.fats_g)), 0),
    hydrationMl: Math.max(Math.round(toNumber(row.hydration_ml)), 0),
    ...(row.notes ? { notes: row.notes } : {}),
  };
}

export async function getNutritionDayLog(input: {
  clientId: string;
  dateKey: string;
  defaultTargets?: NutritionMacroTargets;
}): Promise<NutritionDayResponse> {
  const context = await getTrainingPersistenceContext();
  const baseDayLog = buildDayLog(input.defaultTargets);

  if (!context.configured || !context.userId) {
    return {
      status: "preview",
      storage: "noop",
      dayLog: baseDayLog,
    };
  }

  const dateKey = parseDateKey(input.dateKey);
  const { startIso, endIso } = toUtcRange(dateKey);
  const admin = createAdminSupabaseClient();

  await ensureOwnedClient(input.clientId, context.userId);

  const { data: targetRow, error: targetError } = (await admin
    .from("nutrition_day_targets")
    .select("kcal_target, protein_target, carbs_target, fats_target, water_target_ml, extra_water_ml")
    .eq("client_id", input.clientId)
    .eq("user_id", context.userId)
    .eq("day_date", dateKey)
    .maybeSingle()) as {
    data: NutritionTargetRow | null;
    error: { message: string } | null;
  };

  if (targetError) {
    throw new Error(targetError.message);
  }

  const { data: mealRows, error: mealsError } = (await admin
    .from("meal_logs")
    .select("id, meal_slot, meal_name, notes, eaten_at, kcal, protein_g, carbs_g, fats_g, hydration_ml")
    .eq("client_id", input.clientId)
    .eq("user_id", context.userId)
    .gte("eaten_at", startIso)
    .lt("eaten_at", endIso)
    .order("eaten_at", { ascending: true })) as {
    data: NutritionMealRow[] | null;
    error: { message: string } | null;
  };

  if (mealsError) {
    throw new Error(mealsError.message);
  }

  return {
    status: "connected",
    storage: "supabase",
    dayLog: {
      targets: {
        kcal: targetRow?.kcal_target ?? baseDayLog.targets.kcal,
        protein: targetRow?.protein_target ?? baseDayLog.targets.protein,
        carbs: targetRow?.carbs_target ?? baseDayLog.targets.carbs,
        fats: targetRow?.fats_target ?? baseDayLog.targets.fats,
        waterMl: targetRow?.water_target_ml ?? baseDayLog.targets.waterMl,
      },
      extraWaterMl: targetRow?.extra_water_ml ?? 0,
      meals: (mealRows ?? []).map(mapMealRow),
    },
  };
}

export async function saveNutritionDayLog(input: {
  clientId: string;
  dateKey: string;
  dayLog: NutritionDayLog;
}): Promise<NutritionDayResponse> {
  const context = await getTrainingPersistenceContext();

  if (!context.configured || !context.userId) {
    return {
      status: "preview",
      storage: "noop",
      dayLog: input.dayLog,
    };
  }

  const dateKey = parseDateKey(input.dateKey);
  const { startIso, endIso } = toUtcRange(dateKey);
  const admin = createAdminSupabaseClient();

  await ensureOwnedClient(input.clientId, context.userId);

  const { error: upsertTargetsError } = await admin.from("nutrition_day_targets").upsert(
    {
      user_id: context.userId,
      client_id: input.clientId,
      day_date: dateKey,
      kcal_target: Math.max(Math.round(input.dayLog.targets.kcal), 0),
      protein_target: Math.max(Math.round(input.dayLog.targets.protein), 0),
      carbs_target: Math.max(Math.round(input.dayLog.targets.carbs), 0),
      fats_target: Math.max(Math.round(input.dayLog.targets.fats), 0),
      water_target_ml: Math.max(Math.round(input.dayLog.targets.waterMl), 0),
      extra_water_ml: Math.max(Math.round(input.dayLog.extraWaterMl), 0),
    },
    { onConflict: "client_id,day_date" },
  );

  if (upsertTargetsError) {
    throw new Error(upsertTargetsError.message);
  }

  const { error: deleteMealsError } = await admin
    .from("meal_logs")
    .delete()
    .eq("client_id", input.clientId)
    .eq("user_id", context.userId)
    .gte("eaten_at", startIso)
    .lt("eaten_at", endIso);

  if (deleteMealsError) {
    throw new Error(deleteMealsError.message);
  }

  if (input.dayLog.meals.length > 0) {
    const rows = input.dayLog.meals.map((meal) => ({
      user_id: context.userId,
      client_id: input.clientId,
      source: "manual" as const,
      meal_slot: meal.slot,
      meal_name: meal.name.trim(),
      notes: meal.notes?.trim() || null,
      eaten_at: `${dateKey}T${meal.time}:00+00:00`,
      status: "confirmed" as const,
      kcal: Math.max(Math.round(meal.kcal), 0),
      protein_g: Math.max(Math.round(meal.protein), 0),
      carbs_g: Math.max(Math.round(meal.carbs), 0),
      fats_g: Math.max(Math.round(meal.fats), 0),
      hydration_ml: Math.max(Math.round(meal.hydrationMl), 0),
    }));

    const { error: insertMealsError } = await admin.from("meal_logs").insert(rows);

    if (insertMealsError) {
      throw new Error(insertMealsError.message);
    }
  }

  return getNutritionDayLog({
    clientId: input.clientId,
    dateKey,
    defaultTargets: input.dayLog.targets,
  });
}
