"use client";

import Link from "next/link";

interface MobileTabBarProps {
  activeTab: "profile" | "lab" | "nutrition";
  onSelectTab: (tab: "profile" | "lab" | "nutrition") => void;
  onOpenLive: () => void;
}

const tabs = [
  { id: "profile", label: "Perfil", eyebrow: "home" },
  { id: "lab", label: "Lab", eyebrow: "train" },
  { id: "nutrition", label: "Nutricion", eyebrow: "fuel" },
] as const;

export function MobileTabBar({ activeTab, onSelectTab, onOpenLive }: MobileTabBarProps) {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-[1.6rem] border border-white/10 bg-[#08111a]/96 p-2 text-white shadow-[0_20px_50px_rgba(2,6,23,0.42)] backdrop-blur md:hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-stretch gap-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;

          if (tab.id === "lab") {
            return (
              <Link
                key={tab.id}
                href="/lab/exercises"
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
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-[1.15rem] px-2 py-2 text-center transition ${
                active
                  ? "bg-[#4cb894] text-slate-950"
                  : "bg-white/6 text-white/72 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">{tab.eyebrow}</span>
              <span className="mt-1 text-sm font-semibold">{tab.label}</span>
            </button>
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
