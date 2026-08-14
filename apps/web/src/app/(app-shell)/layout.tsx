import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppNav } from "@/components/navigation/app-nav";
import { MobileRouteNav } from "@/components/navigation/mobile-route-nav";
import { PwaInstallGuide } from "@/components/pwa/pwa-install-guide";

export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[100svh] overflow-x-hidden px-0 py-0 sm:px-4 sm:py-4 lg:px-8 lg:py-8">
      <div className="mx-auto flex min-h-[100svh] max-w-7xl gap-6">
        <Suspense fallback={null}>
          <AppNav />
        </Suspense>
        <div className="min-w-0 flex-1 pb-[calc(7.5rem+env(safe-area-inset-bottom))] xl:pb-0">
          <PwaInstallGuide />
          {children}
        </div>
      </div>
      <Suspense fallback={null}>
        <MobileRouteNav />
      </Suspense>
    </main>
  );
}
