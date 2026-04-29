import { ExerciseCatalog } from "@/components/lab/exercise-catalog";
import { listLabExercises } from "@/lib/lab/persistence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LabExercisesPage() {
  const initialData = await listLabExercises();

  return (
    <ExerciseCatalog initialData={initialData} />
  );
}