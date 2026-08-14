import { LabSessionsBoard } from "@/components/lab/lab-sessions-board";
import { listClients } from "@/lib/client/persistence";
import { listLabExercises } from "@/lib/lab/persistence";
import { listTrainingSessions } from "@/lib/training/persistence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LabSessionsPage() {
  const [clientsResult, exercisesResult] = await Promise.allSettled([listClients(), listLabExercises()]);

  const clientsResponse =
    clientsResult.status === "fulfilled"
      ? clientsResult.value
      : {
          status: "preview" as const,
          storage: "noop" as const,
          clients: [],
        };
  const exercisesResponse =
    exercisesResult.status === "fulfilled"
      ? exercisesResult.value
      : {
          status: "preview" as const,
          storage: "noop" as const,
          exercises: [],
        };

  const initialClientId = clientsResponse.clients[0]?.id ?? null;
  const initialHistoryResponse =
    initialClientId
      ? await listTrainingSessions(160, initialClientId).catch(() => ({
          status: "connected" as const,
          storage: "noop" as const,
          sessions: [],
        }))
      : {
          status: "connected" as const,
          storage: "noop" as const,
          sessions: [],
        };

  const initialStorage =
    clientsResponse.storage === "supabase" ||
    exercisesResponse.storage === "supabase" ||
    initialHistoryResponse.storage === "supabase"
      ? "supabase"
      : "noop";

  return (
    <LabSessionsBoard
      clients={clientsResponse.clients}
      initialClientId={initialClientId}
      initialHistory={initialHistoryResponse.sessions}
      exerciseCatalog={exercisesResponse.exercises}
      initialStorage={initialStorage}
    />
  );
}
