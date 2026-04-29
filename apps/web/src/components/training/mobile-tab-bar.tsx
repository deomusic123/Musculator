"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

interface MobileTabBarProps {
  onOpenLive: () => void;
}

const tabs = [
  { id: "profile", label: "Perfil", eyebrow: "home", href: "/" },
  { id: "lab", label: "Lab", eyebrow: "train", href: "/lab" },
  { id: "nutrition", label: "Nutricion", eyebrow: "fuel", href: "/?surface=nutrition" },
] as const;

function isTabActive(
  pathname: string,
  surface: string | null,
  tabId: (typeof tabs)[number]["id"],
) {
  if (tabId === "lab") {
    return pathname === "/lab" || pathname.startsWith("/lab/") || pathname === "/dashboard";
  }

  if (tabId === "nutrition") {
    return pathname === "/" && surface === "nutrition";
  }

  return pathname === "/" && surface !== "nutrition";
}

export function MobileTabBar({ onOpenLive }: MobileTabBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const surface = searchParams.get("surface");

  return (
    <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 rounded-[1.6rem] border border-white/10 bg-[#08111a]/96 p-2 text-white shadow-[0_20px_50px_rgba(2,6,23,0.42)] backdrop-blur md:hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-stretch gap-2">
        {tabs.map((tab) => {
          const active = isTabActive(pathname, surface, tab.id);

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex min-h-14 flex-col items-center justify-center rounded-[1.15rem] px-2 py-2 text-center transition ${
                active
                  ? "bg-[#4cb894] text-slate-950"
                  : "bg-white/6 text-white/72 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">{tab.eyebrow}</span>
              <span className="mt-1 text-sm font-semibold">{tab.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenLive}
          className="flex min-h-14 min-w-14 items-center justify-center rounded-[1.15rem] bg-[#4cb894] px-4 text-sm font-semibold text-slate-950 transition hover:bg-[#63c7a5]"
        >
          Live
        </button>
      </div>
    </nav>
  );
}
