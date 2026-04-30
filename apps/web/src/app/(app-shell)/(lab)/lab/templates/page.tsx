import { TemplateBuilder } from "@/components/lab/template-builder";
import { listLabExercises } from "@/lib/lab/persistence";
import { listLabTemplates } from "@/lib/lab/template-persistence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LabTemplatesPage() {
  const [templatesResponse, exercisesResponse] = await Promise.all([
    listLabTemplates(),
    listLabExercises(),
  ]);

  return (
    <TemplateBuilder
      initialTemplates={templatesResponse}
      initialExercises={exercisesResponse}
    />
  );
}
