"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";
import { emitDashboardSurface, emitOpenLive } from "@/lib/navigation/app-events";
import {
  NAV_HREFS,
  NAV_LABELS,
  isNavItemActive,
  sidebarDestinations,
  type NavDestination,
} from "@/lib/navigation/app-nav-config";

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const surface = searchParams.get("surface");
  const [, startTransition] = useTransition();

  useEffect(() => {
    router.prefetch(NAV_HREFS.lab);
    router.prefetch("/lab/exercises");
    router.prefetch("/lab/sessions");
    router.prefetch(NAV_HREFS.profile);
  }, [router]);

  const handleTrain = () => {
    if (pathname === "/") {
      emitOpenLive();
      return;
    }

    startTransition(() => {
      router.push("/?live=1");
    });
  };

  const handleSurfaceNav = (item: NavDestination) => {
    if (!item.surface) {
      return;
    }

    if (pathname === "/") {
      emitDashboardSurface(item.surface);
      return;
    }

    startTransition(() => {
      router.push(item.href);
    });
  };

  const primaryDestinations = sidebarDestinations.filter((item) => !item.compact);
  const secondaryDestinations = sidebarDestinations.filter((item) => item.compact);

  return (
    <aside
      data-global-sidebar="true"
      className="hidden w-72 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-4 py-5 xl:flex"
    >
      <div className="flex items-center gap-3 rounded-[1rem] bg-slate-950 px-4 py-3.5 text-white">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold">
          MU
        </div>
        <div>
          <p className="text-lg font-semibold">Musculator</p>
          <p className="text-sm text-white/65">Athlete OS</p>
        </div>
      </div>

      <nav className="mt-6 grid flex-1 content-start gap-2">
        {primaryDestinations.map((item) => {
          const active = isNavItemActive(pathname, surface, item);

          if (item.surface) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSurfaceNav(item)}
                className={`rounded-[1rem] px-4 py-3 text-left transition ${
                  active
                    ? "bg-[#0d1724] text-white"
                    : "bg-transparent text-[var(--muted)] hover:bg-black/[0.04] hover:text-[var(--ink)]"
                }`}
              >
                <p className="text-sm font-medium">{item.label}</p>
                <p className={`mt-1 text-xs ${active ? "text-white/55" : "text-[var(--muted)]"}`}>
                  {item.description}
                </p>
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch
              className={`rounded-[1rem] px-4 py-3 transition ${
                active
                  ? "bg-[#0d1724] text-white"
                  : "bg-transparent text-[var(--muted)] hover:bg-black/[0.04] hover:text-[var(--ink)]"
              }`}
            >
              <p className="text-sm font-medium">{item.label}</p>
              <p className={`mt-1 text-xs ${active ? "text-white/55" : "text-[var(--muted)]"}`}>
                {item.description}
              </p>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 grid gap-2">
        {secondaryDestinations.map((item) => {
          const active = isNavItemActive(pathname, surface, item);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSurfaceNav(item)}
              className={`rounded-[0.9rem] px-4 py-2.5 text-left text-sm transition ${
                active
                  ? "bg-[#0d1724] text-white"
                  : "bg-transparent text-[var(--muted)] hover:bg-black/[0.04] hover:text-[var(--ink)]"
              }`}
            >
              {item.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleTrain}
          className="rounded-[1rem] bg-[#4cb894] px-4 py-3 text-left transition hover:bg-[#63c7a5]"
        >
          <p className="text-sm font-semibold text-slate-950">{NAV_LABELS.train}</p>
          <p className="mt-1 text-xs text-slate-950/70">Abrir check-in de sesión</p>
        </button>
      </div>
    </aside>
  );
}
