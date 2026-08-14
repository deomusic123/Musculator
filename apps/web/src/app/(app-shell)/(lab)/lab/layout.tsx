import { Suspense, type ReactNode } from "react";
import { LabLoadingFallback } from "@/components/lab/lab-loading-fallback";
import { LabTabs } from "@/components/lab/lab-tabs";

export default function LabLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="rounded-[1.8rem] border border-white/8 bg-[#08111a] px-5 py-4 text-white shadow-[0_24px_80px_rgba(2,6,23,0.24)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Lab</p>
            <h1 className="mt-1 text-2xl font-semibold text-white md:text-3xl">Rutinas y arsenal</h1>
          </div>
          <p className="max-w-md text-sm leading-6 text-white/55">
            Diseñá ejercicios y rutinas acá. El Live las usa para entrenar.
          </p>
        </div>
      </section>
      <LabTabs />
      <Suspense fallback={<LabLoadingFallback />}>{children}</Suspense>
    </div>
  );
}
