"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const routeItems = [
  {
    href: "/",
    label: "Inicio",
    eyebrow: "home",
  },
  {
    href: "/lab",
    label: "Lab",
    eyebrow: "train",
  },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/dashboard");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileRouteNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface)]/95 p-2 shadow-[0_20px_50px_rgba(20,33,43,0.2)] backdrop-blur xl:hidden">
      <div className="grid grid-cols-2 gap-2">
        {routeItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center rounded-[1.15rem] px-2 py-2 text-center transition ${
                active
                  ? "bg-slate-950 text-white"
                  : "bg-white/70 text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]"
              }`}
            >
              <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">{item.eyebrow}</span>
              <span className="mt-1 text-sm font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}