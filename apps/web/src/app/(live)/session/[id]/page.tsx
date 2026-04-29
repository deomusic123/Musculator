import Link from "next/link";

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[#05080f] px-4 py-4 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col justify-between rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(76,184,148,0.16),transparent_0_30%),#08111a] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:p-8">
        <section className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-white/45">Instancia de combate</p>
            <h1 className="mt-3 text-3xl font-semibold md:text-5xl">Modo guerra aislado</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
              Ruta independiente sin navegación global. Solo ejecución, cronómetro y controles táctiles. Sesión: {id}.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Abortar
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#4cb894] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#63c7a5]"
            >
              Finalizar
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-[1.8rem] border border-white/10 bg-white/6 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-white/45">Cronómetro</p>
            <p className="mt-6 text-7xl font-semibold tracking-tight">38:12</p>
            <p className="mt-3 text-sm text-white/55">Full-screen, foco total y cero navegación secundaria.</p>
          </article>

          <article className="rounded-[1.8rem] border border-white/10 bg-white/6 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-white/45">Controles táctiles</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                "Reps",
                "Carga",
                "RPE",
              ].map((label) => (
                <div key={label} className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/42">{label}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl">-</button>
                    <span className="text-2xl font-semibold">8</span>
                    <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-xl">+</button>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-[1.4rem] bg-[#4cb894] px-5 py-3 text-base font-semibold text-slate-950 transition hover:bg-[#63c7a5]">
              Check de serie
            </button>
          </article>
        </section>
      </div>
    </main>
  );
}
