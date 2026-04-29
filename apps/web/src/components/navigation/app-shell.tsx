import type { ReactNode } from "react";
import { AppNav } from "./app-nav";
import { MobileRouteNav } from "./mobile-route-nav";

interface AppShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AppShell({ eyebrow, title, description, children }: AppShellProps) {
  return (
    <main className="min-h-[100svh] overflow-x-hidden px-0 py-0 sm:px-4 sm:py-4 lg:px-8 lg:py-8">
      <div className="mx-auto flex min-h-[100svh] max-w-7xl gap-6">
        <AppNav />

        <div className="flex min-w-0 flex-1 flex-col gap-6 pb-[calc(7.5rem+env(safe-area-inset-bottom))] xl:pb-0">
          <section className="rounded-[2rem] border border-white/8 bg-[#08111a] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.24)]">
            <p className="text-sm uppercase tracking-[0.24em] text-white/48">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-white/65 md:text-lg">
              {description}
            </p>
          </section>

          {children}
        </div>
      </div>

      <MobileRouteNav />
    </main>
  );
}