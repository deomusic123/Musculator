import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
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
const cachedProfilesByEmail = new Map<string, DevelopmentProfile>();
const deviceCookieName = "musculator-device-id";
const deviceIdPattern = /^[a-z0-9][a-z0-9-]{11,63}$/;

function buildDeviceEmail(deviceId: string) {
  return `device-${deviceId}@device.musculator.app`;
}

function buildDeviceDisplayName(deviceId: string) {
  return `Device ${deviceId.slice(0, 8)}`;
}

async function readRequestDeviceId() {
  try {
    const cookieStore = await cookies();
    const candidate = cookieStore.get(deviceCookieName)?.value?.trim().toLowerCase();

    if (!candidate || !deviceIdPattern.test(candidate)) {
      return null;
    }

    return candidate;
  } catch {
    return null;
  }
}

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
  const profile = await ensureProfileByIdentity({
    email: env.SUPABASE_DEV_EMAIL,
    displayName: env.SUPABASE_DEV_DISPLAY_NAME,
  });

  cachedDevelopmentProfile = profile;

  return cachedDevelopmentProfile;
}

async function ensureProfileByIdentity(identity: {
  email: string;
  displayName: string;
}): Promise<DevelopmentProfile> {
  const cached = cachedProfilesByEmail.get(identity.email);

  if (cached) {
    return cached;
  }

  const admin = createAdminSupabaseClient();
  const listUsersByPage = async () => {
    const { data: listedUsers, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 500,
    });

    if (listError) {
      throw new Error(listError.message);
    }

    return listedUsers.users;
  };

  const resolveUserByEmail = async () => {
    const users = await listUsersByPage();
    return users.find(
      (candidate) => candidate.email?.toLowerCase() === identity.email.toLowerCase(),
    );
  };

  let user = await resolveUserByEmail();

  if (!user) {
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email: identity.email,
      password: `${randomUUID()}Aa1!`,
      email_confirm: true,
      user_metadata: {
        display_name: identity.displayName,
      },
    });

    if (
      createError &&
      !createError.message.toLowerCase().includes("already registered")
    ) {
      throw new Error(createError.message);
    }

    user = createdUser.user ?? (await resolveUserByEmail()) ?? undefined;
  }

  if (!user?.id) {
    throw new Error("No se pudo resolver el usuario de desarrollo para Supabase.");
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      display_name: identity.displayName,
    },
    {
      onConflict: "id",
    },
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profile = {
    userId: user.id,
    email: user.email ?? identity.email,
    displayName: identity.displayName,
  };

  cachedProfilesByEmail.set(identity.email, profile);

  return profile;
}

export async function getTrainingPersistenceContext(): Promise<TrainingPersistenceContext> {
  if (!hasSupabaseAdminEnv()) {
    return {
      configured: false,
      storage: "noop",
      profileLabel: "preview",
    };
  }

  if (process.env.NODE_ENV === "production") {
    const deviceId = await readRequestDeviceId();

    if (deviceId) {
      const scopedProfile = await ensureProfileByIdentity({
        email: buildDeviceEmail(deviceId),
        displayName: buildDeviceDisplayName(deviceId),
      });

      return {
        configured: true,
        storage: "supabase",
        userId: scopedProfile.userId,
        profileLabel: scopedProfile.displayName,
      };
    }
  }

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