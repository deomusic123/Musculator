"use client";

import { useEffect, useMemo, useState } from "react";

type MealSlot = "desayuno" | "almuerzo" | "pre_entreno" | "post_entreno" | "cena" | "snack";

interface MacroTargets {
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  waterMl: number;
}

interface MealEntry {
  id: string;
  slot: MealSlot;
  name: string;
  time: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  hydrationMl: number;
  notes?: string | undefined;
}

interface NutritionDayLog {
  targets: MacroTargets;
  extraWaterMl: number;
  meals: MealEntry[];
}

interface NutritionStore {
  [clientKey: string]: {
    [dateKey: string]: NutritionDayLog;
  };
}

interface NutritionWorkspaceProps {
  clientId: string | null;
  clientName: string | null;
  clientGoal?: string | undefined;
  weightKg: number;
  persistenceEnabled: boolean;
  supportRatio: number;
  targetSupportRatio: number;
  recoveryGapPercent: number;
  recommendations: string[];
}

interface MealDraft {
  slot: MealSlot;
  name: string;
  time: string;
  kcal: string;
  protein: string;
  carbs: string;
  fats: string;
  hydrationMl: string;
  notes: string;
}

const STORAGE_KEY = "musculator:nutrition:v1";
const MEAL_SLOTS: Array<{ id: MealSlot; label: string }> = [
  { id: "desayuno", label: "Desayuno" },
  { id: "almuerzo", label: "Almuerzo" },
  { id: "pre_entreno", label: "Pre-entreno" },
  { id: "post_entreno", label: "Post-entreno" },
  { id: "cena", label: "Cena" },
  { id: "snack", label: "Snack" },
];

const QUICK_MEALS: Array<{
  label: string;
  slot: MealSlot;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}> = [
  { label: "Pre-entreno base", slot: "pre_entreno", kcal: 380, protein: 30, carbs: 52, fats: 6 },
  { label: "Post-entreno recovery", slot: "post_entreno", kcal: 520, protein: 42, carbs: 62, fats: 11 },
  { label: "Desayuno alto en proteína", slot: "desayuno", kcal: 490, protein: 40, carbs: 45, fats: 16 },
];

function toDateKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function shiftDate(dateKey: string, diffDays: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + diffDays);
  return toDateKey(date);
}

function formatDateLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function nowTimeLabel() {
  return new Date().toTimeString().slice(0, 5);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseNumberInput(raw: string) {
  const normalized = raw.replace(",", ".").trim();
  if (!normalized) {
    return 0;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function createEntryId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function inferTargets(goal: string | undefined, weightKg: number): MacroTargets {
  const normalized = goal?.toLowerCase() ?? "";
  const safeWeight = clamp(weightKg, 45, 160);

  let proteinPerKg = 2;
  let carbsPerKg = 3.5;
  let fatsPerKg = 0.9;

  if (normalized.includes("hipertrof") || normalized.includes("volumen")) {
    proteinPerKg = 2.2;
    carbsPerKg = 4.8;
    fatsPerKg = 1;
  } else if (normalized.includes("fuerza")) {
    proteinPerKg = 2.1;
    carbsPerKg = 4.2;
    fatsPerKg = 1;
  } else if (normalized.includes("defin") || normalized.includes("recompos")) {
    proteinPerKg = 2.3;
    carbsPerKg = 2.8;
    fatsPerKg = 0.8;
  }

  const protein = Math.round(safeWeight * proteinPerKg);
  const carbs = Math.round(safeWeight * carbsPerKg);
  const fats = Math.round(safeWeight * fatsPerKg);
  const kcal = Math.round(protein * 4 + carbs * 4 + fats * 9);
  const waterMl = Math.round((safeWeight * 35) / 250) * 250;

  return {
    kcal,
    protein,
    carbs,
    fats,
    waterMl,
  };
}

function buildDefaultDayLog(targets: MacroTargets): NutritionDayLog {
  return {
    targets,
    extraWaterMl: 0,
    meals: [],
  };
}

function toMealDraft(slot: MealSlot): MealDraft {
  return {
    slot,
    name: "",
    time: nowTimeLabel(),
    kcal: "",
    protein: "",
    carbs: "",
    fats: "",
    hydrationMl: "",
    notes: "",
  };
}

export function NutritionWorkspace({
  clientId,
  clientName,
  clientGoal,
  weightKg,
  persistenceEnabled,
  supportRatio,
  targetSupportRatio,
  recoveryGapPercent,
  recommendations,
}: NutritionWorkspaceProps) {
  const [dateKey, setDateKey] = useState(() => toDateKey());
  const [store, setStore] = useState<NutritionStore>({});
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<MealDraft>(() => toMealDraft("desayuno"));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setStore(parsed as NutritionStore);
      }
    } catch {
      setStore({});
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // ignore quota/storage errors on preview
    }
  }, [store]);

  const clientKey = clientId ?? "preview";
  const inferredTargets = useMemo(() => inferTargets(clientGoal, weightKg), [clientGoal, weightKg]);

  const dayLog = useMemo(() => {
    const clientLogs = store[clientKey] ?? {};
    return clientLogs[dateKey] ?? buildDefaultDayLog(inferredTargets);
  }, [clientKey, dateKey, inferredTargets, store]);

  const sortedMeals = useMemo(
    () => [...dayLog.meals].sort((left, right) => left.time.localeCompare(right.time)),
    [dayLog.meals],
  );

  const totals = useMemo(() => {
    return sortedMeals.reduce(
      (acc, meal) => {
        acc.kcal += meal.kcal;
        acc.protein += meal.protein;
        acc.carbs += meal.carbs;
        acc.fats += meal.fats;
        acc.waterMl += meal.hydrationMl;
        return acc;
      },
      { kcal: 0, protein: 0, carbs: 0, fats: 0, waterMl: 0 },
    );
  }, [sortedMeals]);

  const totalHydration = totals.waterMl + dayLog.extraWaterMl;
  const supportDeltaPercent = Math.round((supportRatio - targetSupportRatio) * 100);
  const adherencePercent = Math.round(
    (Math.min(totals.kcal / Math.max(dayLog.targets.kcal, 1), 1) +
      Math.min(totals.protein / Math.max(dayLog.targets.protein, 1), 1) +
      Math.min(totals.carbs / Math.max(dayLog.targets.carbs, 1), 1) +
      Math.min(totals.fats / Math.max(dayLog.targets.fats, 1), 1)) *
      25,
  );
  const fieldBaseClass =
    "h-11 w-full min-w-0 appearance-none rounded-xl border border-white/10 bg-white/8 px-3 text-white outline-none transition focus:border-[#4cb894] focus:ring-2 focus:ring-[#4cb894]/20";
  const numericFieldClass = `${fieldBaseClass} font-medium tabular-nums`;
  const selectFieldClass = `${fieldBaseClass} pr-9`;
  const timeFieldClass = `${fieldBaseClass} [color-scheme:dark]`;

  const upsertDayLog = (updater: (current: NutritionDayLog) => NutritionDayLog) => {
    setStore((currentStore) => {
      const clientLogs = currentStore[clientKey] ?? {};
      const currentDay = clientLogs[dateKey] ?? buildDefaultDayLog(inferredTargets);
      const nextDay = updater(currentDay);
      return {
        ...currentStore,
        [clientKey]: {
          ...clientLogs,
          [dateKey]: nextDay,
        },
      };
    });
  };

  const handleTargetChange = (field: keyof MacroTargets, value: string) => {
    const parsed = Math.round(parseNumberInput(value));
    upsertDayLog((current) => ({
      ...current,
      targets: {
        ...current.targets,
        [field]: parsed,
      },
    }));
  };

  const handleQuickHydration = (deltaMl: number) => {
    upsertDayLog((current) => ({
      ...current,
      extraWaterMl: Math.max(current.extraWaterMl + deltaMl, 0),
    }));
  };

  const handleDraftChange = (field: keyof MealDraft, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleMealSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim()) {
      setStatusMessage("Agregá un nombre para registrar la comida.");
      return;
    }

    const protein = Math.round(parseNumberInput(draft.protein));
    const carbs = Math.round(parseNumberInput(draft.carbs));
    const fats = Math.round(parseNumberInput(draft.fats));
    const hydrationMl = Math.round(parseNumberInput(draft.hydrationMl));
    const kcalInput = Math.round(parseNumberInput(draft.kcal));
    const kcalCalculated = Math.round(protein * 4 + carbs * 4 + fats * 9);
    const kcal = kcalInput > 0 ? kcalInput : kcalCalculated;

    const meal: MealEntry = {
      id: editingMealId ?? createEntryId(),
      slot: draft.slot,
      name: draft.name.trim(),
      time: draft.time || nowTimeLabel(),
      kcal,
      protein,
      carbs,
      fats,
      hydrationMl,
      notes: draft.notes.trim() || undefined,
    };

    upsertDayLog((current) => ({
      ...current,
      meals: editingMealId
        ? current.meals.map((item) => (item.id === editingMealId ? meal : item))
        : [...current.meals, meal],
    }));

    setStatusMessage(editingMealId ? "Comida actualizada." : "Comida registrada.");
    setEditingMealId(null);
    setDraft(toMealDraft(draft.slot));
  };

  const handleEditMeal = (meal: MealEntry) => {
    setEditingMealId(meal.id);
    setDraft({
      slot: meal.slot,
      name: meal.name,
      time: meal.time,
      kcal: String(meal.kcal),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fats: String(meal.fats),
      hydrationMl: String(meal.hydrationMl),
      notes: meal.notes ?? "",
    });
  };

  const handleDeleteMeal = (mealId: string) => {
    upsertDayLog((current) => ({
      ...current,
      meals: current.meals.filter((item) => item.id !== mealId),
    }));
    if (editingMealId === mealId) {
      setEditingMealId(null);
      setDraft(toMealDraft("desayuno"));
    }
  };

  const handleQuickMeal = (meal: (typeof QUICK_MEALS)[number]) => {
    const quickEntry: MealEntry = {
      id: createEntryId(),
      slot: meal.slot,
      name: meal.label,
      time: nowTimeLabel(),
      kcal: meal.kcal,
      protein: meal.protein,
      carbs: meal.carbs,
      fats: meal.fats,
      hydrationMl: 250,
    };

    upsertDayLog((current) => ({
      ...current,
      meals: [...current.meals, quickEntry],
    }));
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] border border-white/8 bg-[#09111b] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.35)] md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Nutrición deportiva</p>
            <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
              {clientName ? `Plan diario de ${clientName}` : "Plan diario en modo preview"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-white/62">
              Registro real de comidas, hidratación y cumplimiento de macros para sostener el bloque.
            </p>
          </div>
          <span
            className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] ${
              persistenceEnabled
                ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-200"
                : "border-amber-400/25 bg-amber-500/12 text-amber-200"
            }`}
          >
            {persistenceEnabled ? "perfil conectado" : "guardado local"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-2 py-1">
            <button
              type="button"
              onClick={() => setDateKey((current) => shiftDate(current, -1))}
              className="rounded-full px-3 py-1 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Ayer
            </button>
            <button
              type="button"
              onClick={() => setDateKey(toDateKey())}
              className="rounded-full px-3 py-1 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setDateKey((current) => shiftDate(current, 1))}
              className="rounded-full px-3 py-1 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              +1 día
            </button>
          </div>

          <p className="text-sm text-white/58">Fecha activa: {formatDateLabel(dateKey)}</p>

          <p className="text-sm text-white/55">
            Soporte {supportRatio.toFixed(2)} / {targetSupportRatio.toFixed(2)} · gap {supportDeltaPercent > 0 ? "+" : ""}
            {supportDeltaPercent}% · recuperación {recoveryGapPercent}%
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[1.25rem] border border-white/10 bg-white/6 p-3.5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Cumplimiento</p>
            <p className="mt-2 text-2xl font-semibold text-white">{adherencePercent}%</p>
            <p className="mt-1 text-xs text-white/55">Meta diaria de energía y macros.</p>
          </article>
          <article className="rounded-[1.25rem] border border-white/10 bg-white/6 p-3.5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Calorías</p>
            <p className="mt-2 text-2xl font-semibold text-white">{totals.kcal}</p>
            <p className="mt-1 text-xs text-white/55">Objetivo {dayLog.targets.kcal} kcal.</p>
          </article>
          <article className="rounded-[1.25rem] border border-white/10 bg-white/6 p-3.5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Proteína</p>
            <p className="mt-2 text-2xl font-semibold text-white">{totals.protein} g</p>
            <p className="mt-1 text-xs text-white/55">Objetivo {dayLog.targets.protein} g.</p>
          </article>
          <article className="rounded-[1.25rem] border border-white/10 bg-white/6 p-3.5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Hidratación</p>
            <p className="mt-2 text-2xl font-semibold text-white">{totalHydration} ml</p>
            <p className="mt-1 text-xs text-white/55">Objetivo {dayLog.targets.waterMl} ml.</p>
          </article>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <article className="h-full rounded-[1.8rem] border border-white/8 bg-[#0d1724] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.28)] md:p-5">
          <h3 className="text-lg font-semibold text-white">Objetivos y carga de comidas</h3>
          <p className="mt-2 text-sm text-white/55">Ajustá metas diarias y revisá cumplimiento en tiempo real.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1 text-sm text-white/65">
              kcal
              <input
                type="text"
                inputMode="numeric"
                value={dayLog.targets.kcal}
                onChange={(event) => handleTargetChange("kcal", event.target.value)}
                className={numericFieldClass}
              />
            </label>
            <label className="grid gap-1 text-sm text-white/65">
              proteína (g)
              <input
                type="text"
                inputMode="numeric"
                value={dayLog.targets.protein}
                onChange={(event) => handleTargetChange("protein", event.target.value)}
                className={numericFieldClass}
              />
            </label>
            <label className="grid gap-1 text-sm text-white/65">
              carbohidratos (g)
              <input
                type="text"
                inputMode="numeric"
                value={dayLog.targets.carbs}
                onChange={(event) => handleTargetChange("carbs", event.target.value)}
                className={numericFieldClass}
              />
            </label>
            <label className="grid gap-1 text-sm text-white/65">
              grasas (g)
              <input
                type="text"
                inputMode="numeric"
                value={dayLog.targets.fats}
                onChange={(event) => handleTargetChange("fats", event.target.value)}
                className={numericFieldClass}
              />
            </label>
            <label className="grid gap-1 text-sm text-white/65">
              agua (ml)
              <input
                type="text"
                inputMode="numeric"
                value={dayLog.targets.waterMl}
                onChange={(event) => handleTargetChange("waterMl", event.target.value)}
                className={numericFieldClass}
              />
            </label>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() =>
                upsertDayLog((current) => ({
                  ...current,
                  targets: inferredTargets,
                }))
              }
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/8 px-4 text-sm text-white transition hover:bg-white/12"
            >
              Recalcular por objetivo
            </button>
          </div>

          <div className="mt-5 grid gap-2">
            {(
              [
                ["Kcal", totals.kcal, dayLog.targets.kcal],
                ["Proteína", totals.protein, dayLog.targets.protein],
                ["Carbohidratos", totals.carbs, dayLog.targets.carbs],
                ["Grasas", totals.fats, dayLog.targets.fats],
                ["Agua", totalHydration, dayLog.targets.waterMl],
              ] as Array<[string, number, number]>
            ).map(([label, total, target]) => {
              const ratio = clamp(Math.round((total / Math.max(target, 1)) * 100), 0, 130);
              return (
                <div key={label} className="rounded-xl border border-white/8 bg-white/6 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-white/75">{label}</p>
                    <p className="text-white">
                      {total} / {target}
                    </p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-black/35">
                    <div
                      className={`h-2 rounded-full ${
                        ratio <= 100 ? "bg-gradient-to-r from-[#4cb894] to-[#8be9cd]" : "bg-amber-400"
                      }`}
                      style={{ width: `${Math.max(6, ratio)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

        </article>

        <article className="h-full rounded-[1.8rem] border border-white/8 bg-[#09111b] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.32)] md:p-5">
          <h3 className="text-lg font-semibold text-white">{editingMealId ? "Editar comida" : "Registrar comida"}</h3>
          <form onSubmit={handleMealSubmit} className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-white/65">
                Tipo
                <select
                  value={draft.slot}
                  onChange={(event) => handleDraftChange("slot", event.target.value)}
                  className={selectFieldClass}
                >
                  {MEAL_SLOTS.map((slot) => (
                    <option key={slot.id} value={slot.id} className="text-slate-900">
                      {slot.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm text-white/65">
                Hora
                <input
                  type="time"
                  value={draft.time}
                  onChange={(event) => handleDraftChange("time", event.target.value)}
                  className={timeFieldClass}
                />
              </label>
            </div>

            <label className="grid gap-1 text-sm text-white/65">
              Comida
              <input
                value={draft.name}
                onChange={(event) => handleDraftChange("name", event.target.value)}
                placeholder="Ej: arroz + pollo + verduras"
                className={`${fieldBaseClass} placeholder:text-white/35`}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-white/65">
                kcal (opcional)
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.kcal}
                  onChange={(event) => handleDraftChange("kcal", event.target.value)}
                  className={numericFieldClass}
                />
              </label>
              <label className="grid gap-1 text-sm text-white/65">
                Agua con la comida (ml)
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.hydrationMl}
                  onChange={(event) => handleDraftChange("hydrationMl", event.target.value)}
                  className={numericFieldClass}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm text-white/65">
                Prot (g)
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.protein}
                  onChange={(event) => handleDraftChange("protein", event.target.value)}
                  className={numericFieldClass}
                />
              </label>
              <label className="grid gap-1 text-sm text-white/65">
                Carb (g)
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.carbs}
                  onChange={(event) => handleDraftChange("carbs", event.target.value)}
                  className={numericFieldClass}
                />
              </label>
              <label className="grid gap-1 text-sm text-white/65">
                Grasas (g)
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.fats}
                  onChange={(event) => handleDraftChange("fats", event.target.value)}
                  className={numericFieldClass}
                />
              </label>
            </div>

            <label className="grid gap-1 text-sm text-white/65">
              Nota (opcional)
              <input
                value={draft.notes}
                onChange={(event) => handleDraftChange("notes", event.target.value)}
                placeholder="Sensación digestiva, hambre, energía..."
                className={`${fieldBaseClass} placeholder:text-white/35`}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-full bg-[#4cb894] px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#63c7a5]"
              >
                {editingMealId ? "Guardar cambios" : "Registrar comida"}
              </button>
              {editingMealId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMealId(null);
                    setDraft(toMealDraft(draft.slot));
                  }}
                  className="rounded-full border border-white/10 bg-white/8 px-5 py-2 text-sm text-white transition hover:bg-white/12"
                >
                  Cancelar edición
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/6 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Hidratación rápida</p>
            <p className="mt-1 text-xs text-white/58">
              Esto ajusta solo el total de agua del día (sin asociarlo a una comida puntual).
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickHydration(250)}
                className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-white transition hover:bg-white/12"
              >
                +250 ml
              </button>
              <button
                type="button"
                onClick={() => handleQuickHydration(500)}
                className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-white transition hover:bg-white/12"
              >
                +500 ml
              </button>
              <button
                type="button"
                onClick={() => handleQuickHydration(-250)}
                className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-white transition hover:bg-white/12"
              >
                -250 ml
              </button>
            </div>
            <p className="mt-2 text-xs text-white/55">Acumulado manual: {dayLog.extraWaterMl} ml</p>
          </div>

          <div className="mt-4 grid gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Atajos útiles</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_MEALS.map((meal) => (
                <button
                  key={meal.label}
                  type="button"
                  onClick={() => handleQuickMeal(meal)}
                  className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-white/85 transition hover:bg-white/12"
                >
                  {meal.label}
                </button>
              ))}
            </div>
          </div>

          {statusMessage ? (
            <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {statusMessage}
            </p>
          ) : null}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[2rem] border border-white/8 bg-[#0d1724] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
          <h3 className="text-lg font-semibold text-white">Comidas registradas ({sortedMeals.length})</h3>
          <div className="mt-4 grid gap-3">
            {sortedMeals.length === 0 ? (
              <div className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-white/62">
                No hay comidas registradas para este día. Cargá al menos desayuno, post-entreno y cena para controlar la adherencia.
              </div>
            ) : (
              sortedMeals.map((meal) => (
                <div key={meal.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/12 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white/55">
                        {MEAL_SLOTS.find((slot) => slot.id === meal.slot)?.label ?? meal.slot}
                      </span>
                      <span className="text-xs text-white/50">{meal.time}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditMeal(meal)}
                        className="rounded-full border border-white/12 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMeal(meal.id)}
                        className="rounded-full border border-rose-400/30 px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-500/12"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">{meal.name}</p>
                  <p className="mt-1 text-xs text-white/58">
                    {meal.kcal} kcal · P {meal.protein} g · C {meal.carbs} g · G {meal.fats} g · Agua {meal.hydrationMl} ml
                  </p>
                  {meal.notes ? <p className="mt-2 text-xs text-white/58">{meal.notes}</p> : null}
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/8 bg-[#09111b] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
          <h3 className="text-lg font-semibold text-white">Recomendaciones del bloque</h3>
          <div className="mt-4 grid gap-2">
            {recommendations.slice(0, 4).map((recommendation) => (
              <div key={recommendation} className="rounded-[1rem] border border-white/10 bg-white/6 px-3 py-2 text-sm text-white/78">
                {recommendation}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[1rem] border border-white/10 bg-white/6 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Chequeo operativo</p>
            <ul className="mt-2 grid gap-1 text-sm text-white/72">
              <li>• Asegurá proteína distribuida en 3-5 ingestas.</li>
              <li>• No cierres el día sin post-entreno en sesiones fuertes.</li>
              <li>• Hidratación mínima: 70% antes de las 18:00.</li>
            </ul>
          </div>
        </article>
      </section>
    </div>
  );
}
