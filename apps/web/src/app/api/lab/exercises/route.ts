import { NextResponse } from "next/server";
import { listLabExercises } from "@/lib/lab/persistence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const response = await listLabExercises();

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
