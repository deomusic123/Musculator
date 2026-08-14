import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getOptionalClientEnv } from "../env/client";
import type { Database } from "./supabase-types";

type PublicSchema = Database["public"];

type CookieMutation = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function updateSession(request: NextRequest) {
  const env = getOptionalClientEnv();
  const response = NextResponse.next({
    request,
  });
  const deviceCookieName = "musculator-device-id";
  const currentDeviceCookie = request.cookies.get(deviceCookieName)?.value;

  if (!currentDeviceCookie) {
    const generatedDeviceId = crypto.randomUUID();
    request.cookies.set(deviceCookieName, generatedDeviceId);
    response.cookies.set({
      name: deviceCookieName,
      value: generatedDeviceId,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365 * 3,
    });
  }

  if (!env) {
    return response;
  }

  const supabase = createServerClient<Database, "public", PublicSchema>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieMutation[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({
              name,
              value,
              ...(options ?? {}),
            });
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  void user;

  return response;
}