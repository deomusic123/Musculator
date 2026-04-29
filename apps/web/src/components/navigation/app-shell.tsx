import type { ReactNode } from "react";
import { AppNav } from "./app-nav";

interface AppShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AppShell({ eyebrow, title, description, children }: AppShellProps) {
  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto flex max-w-7xl gap-6 pb-24 xl:pb-0">
        <AppNav />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(20,33,43,0.06)]">
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold text-[var(--ink)] md:text-5xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)] md:text-lg">
              {description}
            </p>
          </section>

          {children}
        </div>
      </div>
    </main>
  );
}