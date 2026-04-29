export default function LabProtocolsPage() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(20,33,43,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Protocolos</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">Bloques y mesociclos</h2>
          </div>
          <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
            Crear nuevo
          </button>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-5 text-sm leading-7 text-[var(--muted)]">
          Timeline del bloque de 6 semanas, semanas de build, intensificación, descarga y test. Queda listo para conectar asignaciones reales por cliente.
        </div>
      </article>

      <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(20,33,43,0.06)]">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Reglas del protocolo</p>
        <div className="mt-4 grid gap-3">
          {[
            "Semana 1: Build técnico",
            "Semana 4: Pico controlado",
            "Semana 5: Deload",
            "Asignación por cliente",
          ].map((rule) => (
            <div key={rule} className="rounded-[1.2rem] border border-[var(--border)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)]">
              {rule}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}