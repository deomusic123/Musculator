export default function LabTemplatesPage() {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(20,33,43,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Rutinas</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">Blueprints de sesión</h2>
          </div>
          <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
            Crear nuevo
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {[
            "Pull Densidad",
            "Push Hipertrofia",
            "Legs Fuerza",
            "Boxing Cardio",
          ].map((template) => (
            <div key={template} className="rounded-[1.2rem] border border-[var(--border)] bg-white/70 px-4 py-4 text-sm text-[var(--ink)]">
              {template}
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(20,33,43,0.06)]">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Intención del template</p>
        <div className="mt-5 rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-5 text-sm leading-7 text-[var(--muted)]">
          Acá vive el plano teórico: ejercicios, sets objetivo, RPE y progresión local antes de clonarlo a una sesión real.
        </div>
      </article>
    </section>
  );
}