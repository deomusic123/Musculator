import { hasClientEnv, hasSupabaseProjectUrl } from "../env/client";
import { hasN8nWebhookEnv, hasSupabaseAdminEnv } from "../env/server";

export interface SetupCheck {
  key: string;
  label: string;
  scope: string;
  ready: boolean;
}

export function getSetupChecklist(): SetupCheck[] {
  return [
    {
      key: "supabase-project-url",
      label: "Supabase project URL",
      scope: "web + server runtime",
      ready: hasSupabaseProjectUrl(),
    },
    {
      key: "supabase-browser-env",
      label: "Supabase browser env",
      scope: "cliente web",
      ready: hasClientEnv(),
    },
    {
      key: "supabase-training-admin",
      label: "Supabase training persistence",
      scope: "server runtime",
      ready: hasSupabaseAdminEnv(),
    },
    {
      key: "n8n-webhook",
      label: "n8n workout webhook",
      scope: "server runtime",
      ready: hasN8nWebhookEnv(),
    },
  ];
}