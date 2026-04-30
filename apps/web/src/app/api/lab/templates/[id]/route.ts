import { trainingTemplateBlueprintSchema } from "@musculator/contracts";
import { NextResponse } from "next/server";
import { getLabTemplateById, updateLabTemplate } from "@/lib/lab/template-persistence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface TemplateByIdRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: TemplateByIdRouteContext) {
  try {
    const { id } = await context.params;
    const response = await getLabTemplateById(id);

    return NextResponse.json(response);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudo leer el template.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function PATCH(request: Request, context: TemplateByIdRouteContext) {
  try {
    const { id } = await context.params;
    const payload = trainingTemplateBlueprintSchema.parse(await request.json());
    const response = await updateLabTemplate(id, payload);

    return NextResponse.json(response);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudo actualizar el template.",
      },
      {
        status: 400,
      },
    );
  }
}
