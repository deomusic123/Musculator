import Link from "next/link";
import type { ReactNode } from "react";

interface SiteHeaderProps {
  actions?: ReactNode;
}

export function SiteHeader({ actions }: SiteHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[0_20px_60px_rgba(20,33,43,0.06)] backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
          MU
        </div>
        <div>
          <Link href="/" className="text-lg font-semibold text-[var(--ink)]">
            Musculator
          </Link>
          <p className="text-sm text-[var(--muted)]">
            Precision nutrition, training ingestion and readiness.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <nav className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
          <Link href="/" className="transition hover:text-[var(--ink)]">
            Arquitectura
          </Link>
          <Link href="/lab" className="transition hover:text-[var(--ink)]">
            Training Lab
          </Link>
          <Link href="/api/health" className="transition hover:text-[var(--ink)]">
            Health
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {actions ?? (
            <Link
              href="/lab"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Abrir training lab
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}