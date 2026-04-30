import { NextResponse } from "next/server";
import { parseLabExerciseFiltersFromUrlSearchParams } from "@/lib/lab/exercise-filters";
import { listLabExercises } from "@/lib/lab/persistence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const filters = parseLabExerciseFiltersFromUrlSearchParams(new URL(request.url).searchParams);
    const response = await listLabExercises(filters);

    return NextResponse.json(response);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudo leer el catalogo de ejercicios.",
      },
      {
        status: 400,
      },
    );
  }
}
