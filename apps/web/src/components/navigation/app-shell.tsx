import type { ReactNode } from "react";

interface AppShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AppShell({ eyebrow, title, description, children }: AppShellProps) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="rounded-[2rem] border border-white/8 bg-[#08111a] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.24)]">
        <p className="text-sm uppercase tracking-[0.24em] text-white/48">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-white/65 md:text-lg">
          {description}
        </p>
      </section>

      {children}
    </div>
  );
}
