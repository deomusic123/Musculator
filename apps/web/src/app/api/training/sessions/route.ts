import { trainingSessionDraftSchema } from "@musculator/contracts";
import { NextResponse } from "next/server";
import { listTrainingSessions, saveTrainingSession } from "@/lib/training/persistence";

export async function GET(request: Request) {
  try {
    const clientId = new URL(request.url).searchParams.get("clientId") ?? undefined;
    const history = await listTrainingSessions(8, clientId);

    return NextResponse.json(history);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error ? caughtError.message : "No se pudo leer el historial.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = trainingSessionDraftSchema.parse(await request.json());
    const clientId = request.headers.get("x-client-id") ?? undefined;
    const result = await saveTrainingSession(session, clientId);

    return NextResponse.json(result, {
      status: result.status === "saved" ? 201 : 200,
    });
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error ? caughtError.message : "No se pudo guardar la sesion.",
      },
      {
        status: 400,
      },
    );
  }
}