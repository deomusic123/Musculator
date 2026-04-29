import { NextResponse } from "next/server";
import { createServerSupabaseClient, getSessionState } from "@/lib/platform/supabase-server";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const session = await getSessionState();

  if (session.configured) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin), {
    status: 303,
  });
}