import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SiteHeader } from "@/components/navigation/site-header";
import { getSetupChecklist } from "@/lib/platform/setup";
import { getSessionState } from "@/lib/platform/supabase-server";

export default async function SignInPage() {
  const session = await getSessionState();

  if (session.user) {
    redirect("/");
  }

  const checklist = getSetupChecklist();

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <SiteHeader />

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-8">
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Auth entrypoint</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">
              Sign-in por magic link con Supabase SSR.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
              La sesion se resuelve con cookies, callback dedicado y middleware sobre las rutas protegidas. Si faltan variables, esta pantalla queda en modo setup en lugar de romper.
            </p>

            <div className="mt-6">
              <Suspense
                fallback={
                  <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm text-[var(--muted)]">
                    Cargando estado de autenticacion...
                  </div>
                }
              >
                <SignInForm enabled={session.configured} />
              </Suspense>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-8">
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Checklist</p>
            <div className="mt-5 grid gap-3">
              {checklist.map((item) => (
                <div
                  key={item.key}
                  className="rounded-[1.25rem] border border-[var(--border)] bg-white/70 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--ink)]">{item.label}</p>
                      <p className="text-sm text-[var(--muted)]">{item.scope}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] ${
                        item.ready
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.ready ? "ok" : "pendiente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm leading-7 text-[var(--muted)]">
              Cuando completes las variables publicas y el callback URL, este flujo ya queda listo para entrar y proteger el dashboard.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-white"
            >
              Volver a la arquitectura
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}