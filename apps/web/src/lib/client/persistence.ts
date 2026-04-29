import {
  clientCreateResponseSchema,
  clientListResponseSchema,
  type ClientCreateResponse,
  type ClientListResponse,
  type ClientProfileCreate,
} from "@musculator/contracts";
import { createAdminSupabaseClient, getTrainingPersistenceContext } from "../platform/supabase-admin";

interface ClientRow {
  id: string;
  full_name: string;
  goal: string | null;
  notes: string | null;
  created_at: string;
}

function toIsoDateTime(value: string) {
  const normalized = new Date(value);

  if (Number.isNaN(normalized.getTime())) {
    return value;
  }

  return normalized.toISOString();
}

function toClientProfile(row: ClientRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    goal: row.goal ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: toIsoDateTime(row.created_at),
  };
}

export async function listClients(): Promise<ClientListResponse> {
  const context = await getTrainingPersistenceContext();

  if (!context.configured || !context.userId) {
    return clientListResponseSchema.parse({
      status: "preview",
      storage: "noop",
      clients: [],
    });
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = (await admin
    .from("clients")
    .select("id, full_name, goal, notes, created_at")
    .eq("owner_user_id", context.userId)
    .order("created_at", { ascending: false })) as {
    data: ClientRow[] | null;
    error: { message: string } | null;
  };

  if (error) {
    throw new Error(error.message);
  }

  return clientListResponseSchema.parse({
    status: "connected",
    storage: context.storage,
    clients: (data ?? []).map(toClientProfile),
  });
}

export async function createClient(input: ClientProfileCreate): Promise<ClientCreateResponse> {
  const context = await getTrainingPersistenceContext();

  if (!context.configured || !context.userId) {
    return clientCreateResponseSchema.parse({
      status: "preview",
      storage: "noop",
    });
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = (await admin
    .from("clients")
    .insert({
      owner_user_id: context.userId,
      full_name: input.fullName,
      goal: input.goal ?? null,
      notes: input.notes ?? null,
    })
    .select("id, full_name, goal, notes, created_at")
    .single()) as {
    data: ClientRow | null;
    error: { message: string } | null;
  };

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear el cliente.");
  }

  return clientCreateResponseSchema.parse({
    status: "created",
    storage: context.storage,
    client: toClientProfile(data),
  });
}