import { createTrainingTemplateSession } from "@musculator/domain";
import {
  TrainingWorkspace,
  type DashboardSurface,
  type TrainingWorkspaceBootstrapData,
} from "@/components/training/workspace";
import { listClients } from "@/lib/client/persistence";
import { getSetupChecklist } from "@/lib/platform/setup";
import { listTrainingSessions } from "@/lib/training/persistence";

interface DashboardHomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function resolveInitialSurface(rawSurface: string | string[] | undefined): DashboardSurface {
  const surface = Array.isArray(rawSurface) ? rawSurface[0] : rawSurface;

  if (surface === "nutrition" || surface === "clients") {
    return surface;
  }

  return "profile";
}

async function loadMainBootstrap(): Promise<TrainingWorkspaceBootstrapData> {
  try {
    const clientResponse = await listClients();
    const selectedClientId = clientResponse.clients[0]?.id ?? null;
    const historyResponse = await listTrainingSessions(8, selectedClientId ?? undefined);

    return {
      storageMode:
        clientResponse.storage === "supabase" || historyResponse.storage === "supabase"
          ? "supabase"
          : "noop",
      clients: clientResponse.clients,
      selectedClientId,
      history: historyResponse.sessions,
    };
  } catch {
    return {
      storageMode: "noop",
      clients: [],
      selectedClientId: null,
      history: [],
    };
  }
}

export default async function DashboardHomePage({ searchParams }: DashboardHomePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const initialSession = createTrainingTemplateSession("pull-density");
  const integrations = getSetupChecklist();
  const bootstrap = await loadMainBootstrap();
  const initialSurface = resolveInitialSurface(params?.surface);

  return (
    <TrainingWorkspace
      initialSession={initialSession}
      integrations={integrations}
      bootstrap={bootstrap}
      initialSurface={initialSurface}
    />
  );
}
