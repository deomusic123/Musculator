"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const routeItems = [
  {
    href: "/",
    label: "Perfil",
    eyebrow: "home",
  },
  {
    href: "/lab",
    label: "Lab",
    eyebrow: "train",
  },
  {
    href: "/?surface=nutrition",
    label: "Nutricion",
    eyebrow: "fuel",
  },
] as const;

function isActive(pathname: string, surface: string | null, href: (typeof routeItems)[number]["href"]) {
  if (href === "/lab") {
    return pathname === "/lab" || pathname.startsWith("/lab/") || pathname === "/dashboard";
  }

  if (href === "/?surface=nutrition") {
    return pathname === "/" && surface === "nutrition";
  }

  return pathname === "/" && surface !== "nutrition";
}

export function MobileRouteNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const surface = searchParams.get("surface");

  return (
    <nav data-global-mobile-nav="true" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 rounded-[1.6rem] border border-white/10 bg-[#08111a]/96 p-2 text-white shadow-[0_20px_50px_rgba(2,6,23,0.42)] backdrop-blur xl:hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-stretch gap-2">
        {routeItems.map((item) => {
          const active = isActive(pathname, surface, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center rounded-[1.15rem] px-2 py-2 text-center transition ${
                active
                  ? "bg-[#4cb894] text-slate-950"
                  : "bg-white/6 text-white/72 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">{item.eyebrow}</span>
              <span className="mt-1 text-sm font-semibold">{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/"
          className="flex min-h-14 min-w-14 items-center justify-center rounded-[1.15rem] bg-[#4cb894] px-4 text-sm font-semibold text-slate-950 transition hover:bg-[#63c7a5]"
        >
          Live
        </Link>
      </div>
    </nav>
  );
}