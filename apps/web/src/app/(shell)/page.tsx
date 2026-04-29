import { createTrainingTemplateSession } from "@musculator/domain";
import { AppNav } from "@/components/navigation/app-nav";
import { TrainingWorkspace } from "@/components/training/workspace";
import { getSetupChecklist } from "@/lib/platform/setup";

export default function DashboardHomePage() {
  const initialSession = createTrainingTemplateSession("pull-density");
  const integrations = getSetupChecklist();

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto flex max-w-7xl gap-6 pb-24 xl:pb-0">
        <AppNav />

        <div className="min-w-0 flex-1">
          <TrainingWorkspace initialSession={initialSession} integrations={integrations} />
        </div>
      </div>
    </main>
  );
}