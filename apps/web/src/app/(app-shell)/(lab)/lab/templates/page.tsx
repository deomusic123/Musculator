import { TemplateBuilder } from "@/components/lab/template-builder";
import { listLabExercises } from "@/lib/lab/persistence";
import { getLabTemplateById, listLabTemplates } from "@/lib/lab/template-persistence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LabTemplatesPage() {
  const templatesPromise = listLabTemplates();
  const exercisesPromise = listLabExercises();
  const templatesResponse = await templatesPromise;
  const firstTemplateId = templatesResponse.templates[0]?.id;
  const [exercisesResponse, initialTemplate] = await Promise.all([
    exercisesPromise,
    firstTemplateId ? getLabTemplateById(firstTemplateId).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <TemplateBuilder
      initialTemplates={templatesResponse}
      initialExercises={exercisesResponse}
      initialTemplate={initialTemplate}
    />
  );
}
