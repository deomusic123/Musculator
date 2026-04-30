import type { ReactNode } from "react";

export default function LiveLayout({ children }: { children: ReactNode }) {
  return <main className="min-h-[100svh] overflow-x-hidden">{children}</main>;
}
