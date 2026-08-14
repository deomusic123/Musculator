"use client";

import { useEffect, useState } from "react";
import type { LabExerciseListResponse } from "@/lib/lab/persistence";
import { ExerciseCatalog } from "./exercise-catalog";

const emptyCatalogData: LabExerciseListResponse = {
  status: "preview",
  storage: "noop",
  exercises: [],
};

interface EmbeddedExerciseCatalogProps {
  className?: string;
}

export function EmbeddedExerciseCatalog({ className }: EmbeddedExerciseCatalogProps) {
  const [catalogData, setCatalogData] = useState<LabExerciseListResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadCatalog = async () => {
      try {
        setLoadError(null);

        const response = await fetch("/api/lab/exercises");
        const raw = (await response.json()) as unknown;

        if (!response.ok) {
          throw new Error("No se pudo cargar el catalogo del lab.");
        }

        if (!raw || typeof raw !== "object" || !("exercises" in raw)) {
          throw new Error("Respuesta invalida al cargar el catalogo del lab.");
        }

        const payload = raw as LabExerciseListResponse;

        if (!Array.isArray(payload.exercises)) {
          throw new Error("Formato invalido de ejercicios.");
        }

        if (!isCancelled) {
          setCatalogData(payload);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          setCatalogData(emptyCatalogData);
          setLoadError(caughtError instanceof Error ? caughtError.message : "No se pudo cargar el catalogo.");
        }
      }
    };

    void loadCatalog();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="grid gap-3">
      {loadError ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {loadError}
        </div>
      ) : null}

      <ExerciseCatalog
        initialData={catalogData ?? emptyCatalogData}
        variant="embedded"
        {...(className ? { className } : {})}
      />
    </div>
  );
}
