import type { ReactNode } from "react";
import { AppShell } from "@/components/navigation/app-shell";
import { LabTabs } from "@/components/lab/lab-tabs";

export default function LabLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      eyebrow="Forja e inventario"
      title="Training Lab"
      description="Zona administrativa para diseñar catálogo, rutinas y protocolos fuera del gimnasio. Acá se arma el arsenal, no se registra una sesión live."
    >
      <LabTabs />
      {children}
    </AppShell>
  );
}
