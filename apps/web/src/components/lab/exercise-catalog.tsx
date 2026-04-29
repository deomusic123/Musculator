"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BatteryCharging,
  ChevronDown,
  CircleDot,
  Dumbbell,
  Orbit,
  Search,
  Shield,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { LabExerciseListItem, LabExerciseListResponse } from "@/lib/lab/persistence";

const movementLabel: Record<LabExerciseListItem["movementPattern"], string> = {
  horizontal_push: "Empuje Horizontal",
  vertical_push: "Empuje Vertical",
  horizontal_pull: "Traccion Horizontal",
  vertical_pull: "Traccion Vertical",
  knee_dominant: "Dominante de Rodilla",
  hip_hinge: "Bisagra de Cadera",
  isolation: "Aislamiento",
  core_anti_movement: "Core Anti-Movimiento",
  rotation_ballistic: "Rotacion Balistica",
  locomotion_metabolic: "Locomocion Metabolica",
};

const movementSectionLabel: Record<LabExerciseListItem["movementPattern"], string> = {
  horizontal_push: "HORIZONTAL PUSH",
  vertical_push: "VERTICAL PUSH",
  horizontal_pull: "HORIZONTAL PULL",
  vertical_pull: "VERTICAL PULL",
  knee_dominant: "KNEE DOMINANT",
  hip_hinge: "HIP HINGE",
  isolation: "ISOLATION",
  core_anti_movement: "CORE ANTI-MOVEMENT",
  rotation_ballistic: "ROTATION BALLISTIC",
  locomotion_metabolic: "LOCOMOTION / METABOLIC",
};

const movementOrder: LabExerciseListItem["movementPattern"][] = [
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
];

const movementIcon: Record<LabExerciseListItem["movementPattern"], LucideIcon> = {
  horizontal_push: ArrowRight,
  vertical_push: ArrowUp,
  horizontal_pull: ArrowLeft,
  vertical_pull: ArrowDown,
  knee_dominant: Dumbbell,
  hip_hinge: Activity,
  isolation: CircleDot,
  core_anti_movement: Shield,
  rotation_ballistic: Orbit,
  locomotion_metabolic: Activity,
};

const vectorLabel: Record<LabExerciseListItem["stimulusVector"], string> = {
  amplitud: "AMPLITUD",
  densidad: "DENSIDAD",
  fuerza: "FUERZA",
  cardio_metabolico: "CARDIO",
  acondicionamiento: "ACONDICIONAMIENTO",
  potencia: "POTENCIA",
};

const resistanceLabel: Record<LabExerciseListItem["resistanceProfile"], string> = {
  bodyweight: "Bodyweight",
  free_weight: "Free Weight",
  cable: "Cable",
  machine_constant: "Machine Constant",
  machine_variable: "Machine Variable",
};

function getStimulusClass(stimulus: LabExerciseListItem["stimulusVector"]) {
  switch (stimulus) {
    case "fuerza":
      return "border border-violet-500/60 bg-violet-500/10 text-violet-300";
    case "amplitud":
      return "border border-cyan-500/60 bg-cyan-500/10 text-cyan-300";
    case "densidad":
      return "border border-amber-500/60 bg-amber-500/10 text-amber-300";
    case "potencia":
      return "border border-rose-500/60 bg-rose-500/10 text-rose-300";
    case "acondicionamiento":
      return "border border-emerald-500/60 bg-emerald-500/10 text-emerald-300";
    default:
      return "border border-zinc-600 bg-zinc-800 text-zinc-300";
  }
}

function getCnsSignal(cnsTax: number) {
  if (cnsTax > 8.5) {
    return {
      ring: "border border-rose-400/80 bg-rose-500/20 text-rose-200 shadow-[0_0_14px_rgba(251,113,133,0.35)]",
      zap: "text-rose-300",
    };
  }

  if (cnsTax >= 5) {
    return {
      ring: "border border-amber-500/70 bg-amber-500/20 text-amber-200",
      zap: "text-amber-300",
    };
  }

  return {
    ring: "border border-cyan-500/70 bg-cyan-500/20 text-cyan-200",
    zap: "text-cyan-300",
  };
}

function formatCns(value: number) {
  return value.toFixed(1);
}

interface ExerciseCatalogProps {
  initialData: LabExerciseListResponse;
  variant?: "standalone" | "embedded";
  className?: string;
}

type FilterKey = "pattern" | "vector" | "equipment";
type EquipmentFilter = "all" | "barra" | "mancuerna" | "maquina" | "cable";

interface ExerciseCardProps {
  exercise: LabExerciseListItem;
  onSelect: (exercise: LabExerciseListItem) => void;
}

interface ExerciseSheetProps {
  exercise: LabExerciseListItem;
  onClose: () => void;
}

interface FilterDropdownProps {
  title: string;
  valueLabel: string;
  active: boolean;
  opened: boolean;
  onToggle: () => void;
  panelClassName?: string;
  children: ReactNode;
}

function equipmentLabel(value: EquipmentFilter) {
  switch (value) {
    case "barra":
      return "Barra";
    case "mancuerna":
      return "Mancuerna";
    case "maquina":
      return "Maquina";
    case "cable":
      return "Cable";
    default:
      return "Todos";
  }
}

function normalizeEquipment(equipment: string) {
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

function FilterDropdown({
  title,
  valueLabel,
  active,
  opened,
  onToggle,
  panelClassName,
  children,
}: FilterDropdownProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-1 text-xs uppercase tracking-[0.14em] transition ${
          active ? "text-cyan-300" : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        <span>{title}: {valueLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition ${opened ? "rotate-180" : "rotate-0"}`} />
      </button>

      {opened ? (
        <div
          className={`absolute left-0 top-[calc(100%+8px)] z-40 min-w-[180px] rounded-lg border p-1 shadow-xl shadow-black/40 ${
            panelClassName ?? "border-zinc-800 bg-zinc-900"
          }`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function getMuscleTagClass(role: LabExerciseListItem["primaryMuscles"][number]["role"]) {
  if (role === "primary") {
    return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
  }

  if (role === "stabilizer") {
    return "bg-amber-500/10 text-amber-300 border border-amber-500/20";
  }

  return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
}

function ExerciseCard({ exercise, onSelect }: ExerciseCardProps) {
  const cnsSignal = getCnsSignal(exercise.cnsTaxMultiplier);

  return (
    <button
      type="button"
      onClick={() => onSelect(exercise)}
      className="group flex w-full items-center gap-3 rounded-none px-1 py-3 text-left transition hover:bg-zinc-900/70"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold tracking-tight text-zinc-100">{exercise.name}</p>
        <p className="mt-1 truncate text-xs uppercase tracking-[0.14em] text-zinc-500">{exercise.primaryMuscle.name}</p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getStimulusClass(exercise.stimulusVector)}`}>
          {vectorLabel[exercise.stimulusVector]}
        </span>

        <span className={`inline-flex min-w-[78px] items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${cnsSignal.ring}`}>
          <Zap className={`h-3.5 w-3.5 ${cnsSignal.zap}`} />
          {`⚡ ${formatCns(exercise.cnsTaxMultiplier)}`}
        </span>
      </div>
    </button>
  );
}

function ExerciseSheet({ exercise, onClose }: ExerciseSheetProps) {
  const cnsSignal = getCnsSignal(exercise.cnsTaxMultiplier);
  const PatternIcon = movementIcon[exercise.movementPattern] ?? Dumbbell;

  return (
    <motion.aside
      className="fixed inset-x-0 bottom-0 z-50 mx-auto h-[84vh] max-w-3xl rounded-t-3xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 280 }}
    >
      <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-zinc-700" />

      <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200">
            <PatternIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Athlete OS</p>
            <h3 className="mt-1 truncate text-3xl font-bold tracking-tight text-zinc-100">{exercise.name}</h3>
            <p className="mt-2 text-sm text-zinc-400">
              {movementLabel[exercise.movementPattern]} · {exercise.equipment}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-zinc-600 bg-zinc-800/50 text-zinc-200 shadow-[0_6px_16px_rgba(0,0,0,0.35)] transition hover:bg-zinc-700"
          aria-label="Cerrar detalle"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/5 bg-zinc-800/50 p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">CNS</p>
          <p className="mt-2 inline-flex items-center gap-1 text-lg font-semibold text-zinc-100">
            <Zap className={`h-4 w-4 ${cnsSignal.zap}`} />
            {`⚡ ${formatCns(exercise.cnsTaxMultiplier)}`}
          </p>
        </div>

        <div className="rounded-lg border border-white/5 bg-zinc-800/50 p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Recovery</p>
          <p className="mt-2 inline-flex items-center gap-1 text-lg font-semibold text-zinc-100">
            <BatteryCharging className="h-4 w-4 text-emerald-400" />
            {exercise.recoveryTimeHours}h
          </p>
        </div>

        <div className="rounded-lg border border-white/5 bg-zinc-800/50 p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Vector</p>
          <p className="mt-2 text-sm font-semibold text-zinc-100">{vectorLabel[exercise.stimulusVector]}</p>
        </div>

        <div className="rounded-lg border border-white/5 bg-zinc-800/50 p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Pattern</p>
          <p className="mt-2 text-sm font-semibold text-zinc-100">{movementSectionLabel[exercise.movementPattern]}</p>
        </div>

        <div className="rounded-lg border border-white/5 bg-zinc-800/50 p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Resistencia</p>
          <p className="mt-2 text-sm font-semibold text-zinc-100">{resistanceLabel[exercise.resistanceProfile]}</p>
        </div>

        <div className="rounded-lg border border-white/5 bg-zinc-800/50 p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Tipo</p>
          <p className="mt-2 text-sm font-semibold text-zinc-100">{exercise.isCompound ? "COMPUESTO" : "AISLADO"}</p>
        </div>
      </div>

      <div className="mt-6 space-y-5 overflow-y-auto pb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Primarios ({exercise.primaryMuscles.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {exercise.primaryMuscles.map((muscle) => (
              <span
                key={`${muscle.slug}-${muscle.role}`}
                className={`rounded px-2 py-1 text-xs uppercase tracking-wider ${getMuscleTagClass(muscle.role)}`}
              >
                {muscle.name}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Sinergistas ({exercise.synergistMuscles.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {exercise.synergistMuscles.length === 0 ? (
              <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs uppercase tracking-wider text-zinc-400">
                Sin sinergistas registrados
              </span>
            ) : (
              exercise.synergistMuscles.map((muscle) => (
                <span
                  key={`${muscle.slug}-${muscle.role}`}
                  className={`rounded px-2 py-1 text-xs uppercase tracking-wider ${getMuscleTagClass(muscle.role)}`}
                >
                  {muscle.name}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

export function ExerciseCatalog({ initialData, variant = "standalone", className }: ExerciseCatalogProps) {
  const [query, setQuery] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<LabExerciseListItem | null>(null);
  const [activePattern, setActivePattern] = useState<LabExerciseListItem["movementPattern"] | "all">("all");
  const [activeVector, setActiveVector] = useState<LabExerciseListItem["stimulusVector"] | "all">("all");
  const [activeEquipment, setActiveEquipment] = useState<EquipmentFilter>("all");
  const [openDropdown, setOpenDropdown] = useState<FilterKey | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };

    window.addEventListener("keydown", onKeydown);

    return () => {
      window.removeEventListener("keydown", onKeydown);
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!filtersRef.current) {
        return;
      }

      if (!filtersRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDropdown(null);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  const patternOptions = useMemo(
    () => movementOrder.filter((pattern) => initialData.exercises.some((exercise) => exercise.movementPattern === pattern)),
    [initialData.exercises],
  );

  const vectorOptions = useMemo(
    () =>
      Array.from(new Set(initialData.exercises.map((exercise) => exercise.stimulusVector))).sort((left, right) =>
        vectorLabel[left].localeCompare(vectorLabel[right]),
      ),
    [initialData.exercises],
  );

  const filteredExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return initialData.exercises.filter((exercise) => {
      if (activePattern !== "all" && exercise.movementPattern !== activePattern) {
        return false;
      }

      if (activeVector !== "all" && exercise.stimulusVector !== activeVector) {
        return false;
      }

      if (activeEquipment !== "all" && normalizeEquipment(exercise.equipment) !== activeEquipment) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = [
        exercise.name,
        exercise.slug,
        movementLabel[exercise.movementPattern],
        exercise.equipment,
        exercise.primaryMuscle.name,
        exercise.primaryMuscle.slug,
        ...exercise.primaryMuscles.map((muscle) => muscle.name),
        ...exercise.primaryMuscles.map((muscle) => muscle.slug),
        ...exercise.synergistMuscles.map((muscle) => muscle.name),
        ...exercise.synergistMuscles.map((muscle) => muscle.slug),
        movementSectionLabel[exercise.movementPattern],
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [activeEquipment, activePattern, activeVector, initialData.exercises, query]);

  const groupedExercises = useMemo(() => {
    const groups = new Map<LabExerciseListItem["movementPattern"], LabExerciseListItem[]>();

    for (const exercise of filteredExercises) {
      const previous = groups.get(exercise.movementPattern) ?? [];

      previous.push(exercise);
      groups.set(exercise.movementPattern, previous);
    }

    return movementOrder
      .map((pattern) => ({
        pattern,
        items: (groups.get(pattern) ?? []).sort(
          (left, right) => right.cnsTaxMultiplier - left.cnsTaxMultiplier || left.name.localeCompare(right.name),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredExercises]);

  const isEmbedded = variant === "embedded";
  const headerClass = isEmbedded
    ? "border-b border-white/10 bg-[#09111b]/95"
    : "border-b border-zinc-800/80 bg-zinc-950/90";
  const inputClass = isEmbedded
    ? "h-12 w-full rounded-2xl border border-white/10 bg-black/25 pl-11 pr-20 text-sm text-white outline-none transition focus:border-[#4cb894] focus:ring-2 focus:ring-[#4cb894]/20"
    : "h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 pl-11 pr-20 text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/30";
  const shortcutClass = isEmbedded
    ? "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55"
    : "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400";
  const dropdownPanelClass = isEmbedded ? "border-white/10 bg-[#0d1724]" : "border-zinc-800 bg-zinc-900";
  const dropdownItemClass = isEmbedded
    ? "block w-full rounded-md px-2 py-1.5 text-left text-xs text-white/78 transition hover:bg-white/10"
    : "block w-full rounded-md px-2 py-1.5 text-left text-xs text-zinc-300 transition hover:bg-zinc-800";
  const metaClass = isEmbedded ? "text-xs text-white/55" : "text-xs text-zinc-500";
  const sectionHeaderClass = isEmbedded
    ? "sticky top-[124px] z-20 -mx-4 border-y border-white/10 bg-[#09111b]/95 px-4 py-2 backdrop-blur-md"
    : "sticky top-[124px] z-20 -mx-3 border-y border-zinc-800/80 bg-zinc-950/95 px-3 py-2 backdrop-blur-md sm:-mx-5 sm:px-5";
  const sectionTitleClass = isEmbedded
    ? "text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50"
    : "text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500";
  const countBadgeClass = isEmbedded
    ? "rounded-md border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60"
    : "rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400";
  const listDividerClass = isEmbedded ? "divide-y divide-white/10" : "divide-y divide-zinc-800";
  const emptyStateClass = isEmbedded
    ? "rounded-xl border border-white/10 bg-black/20 p-6 text-center text-sm text-white/65"
    : "rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-400";

  const containerClass =
    variant === "embedded"
      ? "relative isolate space-y-4 overflow-hidden rounded-[2.2rem] border border-white/8 bg-[#09111b] p-4 text-white shadow-[0_24px_80px_rgba(2,6,23,0.35)]"
      : "relative isolate space-y-4 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-100 sm:p-5";

  return (
    <section className={`${containerClass}${className ? ` ${className}` : ""}`}>
      <div className="pointer-events-none absolute -top-24 right-[-80px] h-52 w-52 rounded-full bg-cyan-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-[-80px] h-52 w-52 rounded-full bg-red-600/10 blur-3xl" />

      <div className={`sticky top-0 z-30 pb-3 pt-1 backdrop-blur-md ${headerClass}`}>
        <label className="relative mx-auto block max-w-3xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, musculo o patron"
            className={inputClass}
          />

          <span className={shortcutClass}>
            Cmd/Ctrl + K
          </span>
        </label>

        <div ref={filtersRef} className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
          <FilterDropdown
            title="Patron"
            valueLabel={activePattern === "all" ? "Todos" : movementLabel[activePattern]}
            active={activePattern !== "all"}
            opened={openDropdown === "pattern"}
            onToggle={() => setOpenDropdown((current) => (current === "pattern" ? null : "pattern"))}
            panelClassName={dropdownPanelClass}
          >
            <button
              type="button"
              onClick={() => {
                setActivePattern("all");
                setOpenDropdown(null);
              }}
              className={dropdownItemClass}
            >
              Todos
            </button>
            {patternOptions.map((pattern) => (
              <button
                key={pattern}
                type="button"
                onClick={() => {
                  setActivePattern(pattern);
                  setOpenDropdown(null);
                }}
                className={dropdownItemClass}
              >
                {movementLabel[pattern]}
              </button>
            ))}
          </FilterDropdown>

          <FilterDropdown
            title="Vector"
            valueLabel={activeVector === "all" ? "Todos" : vectorLabel[activeVector]}
            active={activeVector !== "all"}
            opened={openDropdown === "vector"}
            onToggle={() => setOpenDropdown((current) => (current === "vector" ? null : "vector"))}
            panelClassName={dropdownPanelClass}
          >
            <button
              type="button"
              onClick={() => {
                setActiveVector("all");
                setOpenDropdown(null);
              }}
              className={dropdownItemClass}
            >
              Todos
            </button>
            {vectorOptions.map((vector) => (
              <button
                key={vector}
                type="button"
                onClick={() => {
                  setActiveVector(vector);
                  setOpenDropdown(null);
                }}
                className={dropdownItemClass}
              >
                {vectorLabel[vector]}
              </button>
            ))}
          </FilterDropdown>

          <FilterDropdown
            title="Equipamiento"
            valueLabel={equipmentLabel(activeEquipment)}
            active={activeEquipment !== "all"}
            opened={openDropdown === "equipment"}
            onToggle={() => setOpenDropdown((current) => (current === "equipment" ? null : "equipment"))}
            panelClassName={dropdownPanelClass}
          >
            {(["all", "barra", "mancuerna", "maquina", "cable"] as EquipmentFilter[]).map((equipment) => (
              <button
                key={equipment}
                type="button"
                onClick={() => {
                  setActiveEquipment(equipment);
                  setOpenDropdown(null);
                }}
                className={dropdownItemClass}
              >
                {equipmentLabel(equipment)}
              </button>
            ))}
          </FilterDropdown>
        </div>
      </div>

      <div className={`flex items-center justify-between px-1 ${metaClass}`}>
        <span>{filteredExercises.length} ejercicios visibles</span>
        <span className="uppercase tracking-[0.14em]">{initialData.storage}</span>
      </div>

      <motion.div layout className="space-y-5" initial={false}>
        {groupedExercises.map((group) => (
          <section key={group.pattern} className="space-y-1">
            <div className={sectionHeaderClass}>
              <div className="flex items-center justify-between gap-3">
                <p className={sectionTitleClass}>
                  {movementSectionLabel[group.pattern]}
                </p>
                <span className={countBadgeClass}>
                  {group.items.length}
                </span>
              </div>
            </div>

            <div className={listDividerClass}>
              {group.items.map((exercise) => (
                <ExerciseCard key={exercise.slug} exercise={exercise} onSelect={setSelectedExercise} />
              ))}
            </div>
          </section>
        ))}
      </motion.div>

      {filteredExercises.length === 0 ? (
        <div className={emptyStateClass}>
          No hay resultados para esa combinacion de filtros.
        </div>
      ) : null}

      <AnimatePresence>
        {selectedExercise ? (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 bg-black/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedExercise(null)}
              aria-label="Cerrar detalle"
            />
            <ExerciseSheet exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />
          </>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
