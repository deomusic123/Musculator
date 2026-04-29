import { NextResponse } from "next/server";
import { getSetupChecklist } from "@/lib/platform/setup";
import { getSessionState } from "@/lib/platform/supabase-server";

export async function GET() {
  const session = await getSessionState();

  return NextResponse.json({
    ok: true,
    authenticated: Boolean(session.user),
    supabaseConfigured: session.configured,
    integrations: getSetupChecklist(),
  });
}