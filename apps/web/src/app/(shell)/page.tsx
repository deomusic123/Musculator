import { ProfileDashboard } from "@/components/dashboard/profile-dashboard";
import { AppShell } from "@/components/navigation/app-shell";

export default function DashboardHomePage() {
  return (
    <AppShell
      eyebrow="Cockpit"
      title="Perfil y telemetria"
      description="Superficie de lectura para readiness, contexto del atleta e indicadores clave. El trabajo administrativo de entrenamiento vive en Training Lab."
    >
      <ProfileDashboard />
    </AppShell>
  );
}