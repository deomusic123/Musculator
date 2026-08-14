"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const tabs = [
  { href: "/lab/exercises", label: "Ejercicios" },
  { href: "/lab/templates", label: "Rutinas" },
  { href: "/lab/protocols", label: "Protocolos" },
  { href: "/lab/sessions", label: "Sesiones" },
] as const;

export function LabTabs() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    for (const tab of tabs) {
      router.prefetch(tab.href);
    }
  }, [router]);

  return (
    <div className="flex flex-wrap gap-2 rounded-[1.6rem] border border-white/10 bg-[#08111a] p-3 text-white shadow-[0_24px_80px_rgba(2,6,23,0.24)]">
      {tabs.map((tab) => {
        const active = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch
            className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-[#4cb894] text-slate-950"
                : "border border-white/10 bg-white/6 text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
