"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    shortLabel: "Inicio",
  },
  {
    href: "/lab",
    label: "Training Lab",
    shortLabel: "Lab",
  },
];

const shortcutItems = [
  { href: "/lab/exercises", label: "Ejercicios", badge: "lab" },
  { href: "/lab/templates", label: "Rutinas", badge: "lab" },
  { href: "/lab/protocols", label: "Protocolos", badge: "lab" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`) || (href === "/lab" && pathname === "/dashboard");
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(20,33,43,0.06)] xl:block">
      <div className="flex items-center gap-3 rounded-[1.5rem] bg-slate-950 px-4 py-4 text-white">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold">
          MU
        </div>
        <div>
          <p className="text-lg font-semibold">Musculator</p>
          <p className="text-sm text-white/65">Athlete OS zero-bloat</p>
        </div>
      </div>

      <nav className="mt-6 grid gap-2">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-[1.3rem] px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-[#0d1724] text-white"
                  : "bg-white/70 text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

      </nav>

      <div className="mt-8 rounded-[1.5rem] border border-[var(--border)] bg-white/65 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Atajos de dominio</p>
        <div className="mt-4 grid gap-2">
          {shortcutItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-[1.1rem] border px-3 py-3 text-sm transition ${
                isActive(pathname, item.href)
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--ink)] hover:bg-white"
              }`}
            >
              <span>{item.label}</span>
              <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${
                isActive(pathname, item.href)
                  ? "bg-white/15 text-white"
                  : "bg-slate-950 text-white/80"
              }`}>
                {item.badge}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}