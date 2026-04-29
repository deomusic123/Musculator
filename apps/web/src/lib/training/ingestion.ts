import {
  trainingIngestionResponseSchema,
  type TrainingIngestionRequest,
  type TrainingIngestionResponse,
} from "@musculator/contracts";
import { summarizeWorkoutIntake } from "@musculator/domain";
import { getServerEnv, hasN8nWebhookEnv } from "../env/server";
import { createAdminSupabaseClient, getTrainingPersistenceContext } from "../platform/supabase-admin";

export async function processTrainingIngestion(input: {
  payload: TrainingIngestionRequest;
}): Promise<TrainingIngestionResponse> {
  const summary = summarizeWorkoutIntake(input.payload.parsedPayload ?? []);
  const context = await getTrainingPersistenceContext();
  const storage: "supabase" | "noop" = context.storage;

  if (context.configured && context.userId) {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("training_ingestions").insert({
      user_id: context.userId,
      source: input.payload.source,
      raw_input: input.payload.rawInput,
      parsed_payload: input.payload.parsedPayload ?? [],
      status: input.payload.parsedPayload ? "parsed" : "received",
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  let n8nForwarded = false;

  if (context.configured && context.userId && hasN8nWebhookEnv()) {
    const env = getServerEnv();

    try {
      const response = await fetch(env.N8N_WORKOUT_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-musculator-webhook-secret": env.N8N_WORKOUT_WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          userId: context.userId,
          rawInput: input.payload.rawInput,
          source: input.payload.source,
          parsedPayload: input.payload.parsedPayload ?? [],
          summary,
        }),
      });

      n8nForwarded = response.ok;
    } catch {
      n8nForwarded = false;
    }
  }

  return trainingIngestionResponseSchema.parse({
    status: storage === "supabase" ? "accepted" : "preview",
    storage,
    n8nForwarded,
    summary,
  });
}