"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/lab/exercises", label: "Ejercicios" },
  { href: "/lab/templates", label: "Rutinas" },
  { href: "/lab/protocols", label: "Protocolos" },
];

export function LabTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_20px_60px_rgba(20,33,43,0.06)]">
      {tabs.map((tab) => {
        const active = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-slate-950 text-white"
                : "border border-[var(--border)] bg-white/70 text-[var(--muted)] hover:bg-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}