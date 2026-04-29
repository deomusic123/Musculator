"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getOptionalClientEnv } from "../env/client";
import type { Database } from "./supabase-types";

type PublicSchema = Database["public"];

export function createBrowserSupabaseClient() {
  const env = getOptionalClientEnv();

  if (!env) {
    return null;
  }

  return createBrowserClient<Database, "public", PublicSchema>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}