import { clientProfileCreateSchema } from "@musculator/contracts";
import { NextResponse } from "next/server";
import { createClient, listClients } from "@/lib/client/persistence";
import { getClientProfileAnalytics } from "@/lib/training/persistence";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const analytics = url.searchParams.get("analytics");

    if (analytics === "1") {
      const clientId = url.searchParams.get("clientId");

      if (!clientId) {
        throw new Error("Falta clientId para analytics.");
      }

      const response = await getClientProfileAnalytics(clientId);

      return NextResponse.json(response);
    }

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