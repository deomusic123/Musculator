import { createTrainingTemplateSession } from "@musculator/domain";
import { AppNav } from "@/components/navigation/app-nav";
import { TrainingWorkspace } from "@/components/training/workspace";
import { getSetupChecklist } from "@/lib/platform/setup";

export default function DashboardHomePage() {
  const initialSession = createTrainingTemplateSession("pull-density");
  const integrations = getSetupChecklist();

  return (
    <main className="min-h-[100dvh] overflow-hidden px-0 py-0 sm:px-4 sm:py-4 lg:px-8 lg:py-8">
      <div className="mx-auto flex h-[100dvh] max-w-7xl gap-6 sm:h-auto">
        <AppNav />

        <div className="min-w-0 flex-1 sm:min-h-0">
          <TrainingWorkspace initialSession={initialSession} integrations={integrations} />
        </div>
      </div>
    </main>
  );
}