import { trainingSessionDraftSchema } from "@musculator/contracts";
import { NextResponse } from "next/server";
import { deleteTrainingSession, listTrainingSessions, saveTrainingSession } from "@/lib/training/persistence";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId") ?? undefined;
    const requestedLimit = Number(url.searchParams.get("limit") ?? "8");
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.round(requestedLimit), 1), 84)
      : 8;
    const history = await listTrainingSessions(limit, clientId);

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

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    const clientId =
      url.searchParams.get("clientId") ?? request.headers.get("x-client-id") ?? undefined;

    if (!sessionId) {
      throw new Error("Falta sessionId para eliminar la sesion.");
    }

    const result = await deleteTrainingSession(sessionId, clientId);

    return NextResponse.json(result);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error ? caughtError.message : "No se pudo eliminar la sesion.",
      },
      {
        status: 400,
      },
    );
  }
}