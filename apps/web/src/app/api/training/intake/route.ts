import { trainingIngestionRequestSchema } from "@musculator/contracts";
import { NextResponse } from "next/server";
import { processTrainingIngestion } from "@/lib/training/ingestion";

export async function POST(request: Request) {
  try {
    const payload = trainingIngestionRequestSchema.parse(await request.json());

    const result = await processTrainingIngestion({ payload });

    return NextResponse.json(result, {
      status: result.status === "accepted" ? 202 : 200,
    });
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error ? caughtError.message : "No se pudo procesar la ingesta.",
      },
      {
        status: 400,
      },
    );
  }
}