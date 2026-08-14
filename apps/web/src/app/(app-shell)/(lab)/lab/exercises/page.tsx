import { ExerciseCatalog } from "@/components/lab/exercise-catalog";
import { parseLabExerciseFiltersFromRecord } from "@/lib/lab/exercise-filters";
import { listLabExercises } from "@/lib/lab/persistence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface LabExercisesPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LabExercisesPage({ searchParams }: LabExercisesPageProps) {
  const rawSearchParams = searchParams ? await searchParams : undefined;
  const filters = parseLabExerciseFiltersFromRecord(rawSearchParams);
  const initialData = await listLabExercises();

  return (
    <ExerciseCatalog
      initialData={initialData}
      initialFilters={filters}
      syncWithUrl
    />
  );
}
