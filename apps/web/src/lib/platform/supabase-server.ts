import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getClientEnv, getOptionalClientEnv } from "../env/client";
import type { Database } from "./supabase-types";

type PublicSchema = Database["public"];

type CookieMutation = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function createServerSupabaseClient() {
  const env = getClientEnv();
  const cookieStore = await cookies();

  return createServerClient<Database, "public", PublicSchema>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieMutation[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set({
                name,
                value,
                ...(options ?? {}),
              });
            });
          } catch {
            // Server components can read cookies but not always mutate them.
          }
        },
      },
    },
  );
}

export async function getSessionState(): Promise<{
  configured: boolean;
  user: User | null;
}> {
  if (!getOptionalClientEnv()) {
    return {
      configured: false,
      user: null,
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    configured: true,
    user,
  };
}