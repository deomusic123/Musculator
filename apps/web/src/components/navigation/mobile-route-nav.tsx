"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { emitDashboardSurface, emitOpenLive, subscribeChromeLock } from "@/lib/navigation/app-events";
import {
  NAV_HREFS,
  NAV_LABELS,
  isNavItemActive,
  mobileDestinations,
  type NavDestination,
} from "@/lib/navigation/app-nav-config";

export function MobileRouteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const surface = searchParams.get("surface");
  const [, startTransition] = useTransition();
  const [chromeLocked, setChromeLocked] = useState(false);

  useEffect(() => {
    router.prefetch(NAV_HREFS.lab);
    router.prefetch("/lab/exercises");
    router.prefetch("/lab/sessions");
  }, [router]);

  useEffect(() => {
    return subscribeChromeLock(setChromeLocked);
  }, []);

  if (pathname.startsWith("/session/") || chromeLocked) {
    return null;
  }

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

  const handleTrainNav = () => {
    if (pathname === "/") {
      emitOpenLive();
      return;
    }

    startTransition(() => {
      router.push("/?live=1");
    });
  };

  return (
    <nav
      data-global-mobile-nav="true"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#08111a]/98 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2 text-white shadow-[0_-14px_36px_rgba(2,6,23,0.35)] backdrop-blur xl:hidden"
    >
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-stretch gap-0.5">
        {mobileDestinations.map((item) => {
          const active = isNavItemActive(pathname, surface, item);

          if (item.surface) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSurfaceNav(item)}
                className={`flex min-h-14 flex-col items-center justify-center rounded-lg border-t-2 px-2 py-2 text-center transition ${
                  active
                    ? "border-[#4cb894] bg-white/8 text-white"
                    : "border-transparent bg-transparent text-white/72 hover:bg-white/6 hover:text-white"
                }`}
              >
                <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">{item.eyebrow}</span>
                <span className="mt-1 text-sm font-semibold">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch
              className={`flex min-h-14 flex-col items-center justify-center rounded-lg border-t-2 px-2 py-2 text-center transition ${
                active
                  ? "border-[#4cb894] bg-white/8 text-white"
                  : "border-transparent bg-transparent text-white/72 hover:bg-white/6 hover:text-white"
              }`}
            >
              <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">{item.eyebrow}</span>
              <span className="mt-1 text-sm font-semibold">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={handleTrainNav}
          className="flex min-h-14 min-w-14 items-center justify-center rounded-lg border-t-2 border-[#4cb894] bg-[#4cb894]/15 px-4 text-sm font-semibold text-[#9cf3d3] transition hover:bg-[#4cb894]/25"
        >
          {NAV_LABELS.train}
        </button>
      </div>
    </nav>
  );
}
