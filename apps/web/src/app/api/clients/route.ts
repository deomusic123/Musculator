import { clientProfileCreateSchema } from "@musculator/contracts";
import { NextResponse } from "next/server";
import { createClient, listClients } from "@/lib/client/persistence";

export async function GET() {
  try {
    const response = await listClients();

    return NextResponse.json(response);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error ? caughtError.message : "No se pudieron leer los clientes.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = clientProfileCreateSchema.parse(await request.json());
    const response = await createClient(payload);

    return NextResponse.json(response, {
      status: response.status === "created" ? 201 : 200,
    });
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error ? caughtError.message : "No se pudo crear el cliente.",
      },
      {
        status: 400,
      },
    );
  }
}