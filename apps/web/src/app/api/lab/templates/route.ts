import { trainingTemplateBlueprintSchema } from "@musculator/contracts";
import { NextResponse } from "next/server";
import { createLabTemplate, listLabTemplates } from "@/lib/lab/template-persistence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const response = await listLabTemplates();

    return NextResponse.json(response);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudo leer el listado de templates.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = trainingTemplateBlueprintSchema.parse(await request.json());
    const response = await createLabTemplate(payload);

    return NextResponse.json(response, {
      status: response.saveStatus === "saved" ? 201 : 200,
    });
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudo crear el template.",
      },
      {
        status: 400,
      },
    );
  }
}
