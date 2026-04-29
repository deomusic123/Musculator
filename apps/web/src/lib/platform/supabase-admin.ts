import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminEnv, hasSupabaseAdminEnv } from "../env/server";

interface DevelopmentProfile {
  userId: string;
  email: string;
  displayName: string;
}

export interface TrainingPersistenceContext {
  configured: boolean;
  storage: "supabase" | "noop";
  userId?: string;
  profileLabel: string;
}

let cachedDevelopmentProfile: DevelopmentProfile | null = null;

export function createAdminSupabaseClient() {
  const env = getSupabaseAdminEnv();

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function ensureDevelopmentProfile(): Promise<DevelopmentProfile | null> {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  if (cachedDevelopmentProfile) {
    return cachedDevelopmentProfile;
  }

  const env = getSupabaseAdminEnv();
  const admin = createAdminSupabaseClient();
  const { data: listedUsers, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listError) {
    throw new Error(listError.message);
  }

  let user = listedUsers.users.find(
    (candidate) => candidate.email?.toLowerCase() === env.SUPABASE_DEV_EMAIL.toLowerCase(),
  );

  if (!user) {
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email: env.SUPABASE_DEV_EMAIL,
      password: `${randomUUID()}Aa1!`,
      email_confirm: true,
      user_metadata: {
        display_name: env.SUPABASE_DEV_DISPLAY_NAME,
      },
    });

    if (createError) {
      throw new Error(createError.message);
    }

    user = createdUser.user ?? undefined;
  }

  if (!user?.id) {
    throw new Error("No se pudo resolver el usuario de desarrollo para Supabase.");
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      display_name: env.SUPABASE_DEV_DISPLAY_NAME,
    },
    {
      onConflict: "id",
    },
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  cachedDevelopmentProfile = {
    userId: user.id,
    email: user.email ?? env.SUPABASE_DEV_EMAIL,
    displayName: env.SUPABASE_DEV_DISPLAY_NAME,
  };

  return cachedDevelopmentProfile;
}

export async function getTrainingPersistenceContext(): Promise<TrainingPersistenceContext> {
  const profile = await ensureDevelopmentProfile();

  if (!profile) {
    return {
      configured: false,
      storage: "noop",
      profileLabel: "preview",
    };
  }

  return {
    configured: true,
    storage: "supabase",
    userId: profile.userId,
    profileLabel: profile.displayName,
  };
}