import { NextResponse } from "next/server";
import { createServerSupabaseClient, getSessionState } from "@/lib/platform/supabase-server";

function getSafeNextPath(candidate: string | null) {
  if (!candidate || !candidate.startsWith("/")) {
    return "/dashboard";
  }

  return candidate;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const session = await getSessionState();

  if (!session.configured) {
    return NextResponse.redirect(new URL("/sign-in?missing=supabase", requestUrl.origin));
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}