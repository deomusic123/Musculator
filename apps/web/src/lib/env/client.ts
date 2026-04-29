import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const projectUrlSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

function readClientEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function hasClientEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function hasSupabaseProjectUrl() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseProjectUrl() {
  return projectUrlSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  }).NEXT_PUBLIC_SUPABASE_URL;
}

export function getClientEnv(): ClientEnv {
  return clientEnvSchema.parse(readClientEnv());
}

export function getOptionalClientEnv(): ClientEnv | null {
  if (!hasClientEnv()) {
    return null;
  }

  return clientEnvSchema.parse(readClientEnv());
}
