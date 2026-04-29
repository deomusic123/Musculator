import { z } from "zod";
import { getSupabaseProjectUrl, hasSupabaseProjectUrl } from "./client";

const requiredServerEnvSchema = z.object({
  N8N_WORKOUT_WEBHOOK_URL: z.string().url(),
  N8N_WORKOUT_WEBHOOK_SECRET: z.string().min(1),
});

const optionalServerEnvSchema = z.object({
  N8N_WORKOUT_WEBHOOK_URL: z.string().url().optional(),
  N8N_WORKOUT_WEBHOOK_SECRET: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_DEV_EMAIL: z.string().email().optional(),
  SUPABASE_DEV_DISPLAY_NAME: z.string().min(1).optional(),
});

const supabaseAdminEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_DEV_EMAIL: z.string().email(),
  SUPABASE_DEV_DISPLAY_NAME: z.string().min(1).default("Musculator Dev"),
});

export type ServerEnv = z.infer<typeof requiredServerEnvSchema>;
export type SupabaseAdminEnv = z.infer<typeof supabaseAdminEnvSchema> & {
  NEXT_PUBLIC_SUPABASE_URL: string;
};

function readServerEnv() {
  return {
    N8N_WORKOUT_WEBHOOK_URL: process.env.N8N_WORKOUT_WEBHOOK_URL,
    N8N_WORKOUT_WEBHOOK_SECRET: process.env.N8N_WORKOUT_WEBHOOK_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_DEV_EMAIL: process.env.SUPABASE_DEV_EMAIL,
    SUPABASE_DEV_DISPLAY_NAME: process.env.SUPABASE_DEV_DISPLAY_NAME,
  };
}

export function hasN8nWebhookEnv() {
  return Boolean(
    process.env.N8N_WORKOUT_WEBHOOK_URL && process.env.N8N_WORKOUT_WEBHOOK_SECRET,
  );
}

export function hasSupabaseAdminEnv() {
  return Boolean(
    hasSupabaseProjectUrl() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SUPABASE_DEV_EMAIL,
  );
}

export function getServerEnv(): ServerEnv {
  return requiredServerEnvSchema.parse(readServerEnv());
}

export function getOptionalServerEnv() {
  return optionalServerEnvSchema.parse(readServerEnv());
}

export function getSupabaseAdminEnv(): SupabaseAdminEnv {
  const parsed = supabaseAdminEnvSchema.parse(readServerEnv());

  return {
    ...parsed,
    NEXT_PUBLIC_SUPABASE_URL: getSupabaseProjectUrl(),
  };
}
