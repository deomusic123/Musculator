import type { DashboardSurfaceEvent } from "./app-events";

export const NAV_LABELS = {
  profile: "Perfil",
  lab: "Lab",
  nutrition: "Nutrición",
  clients: "Clientes",
  train: "Entrenar",
} as const;

export const NAV_HREFS = {
  profile: "/",
  lab: "/lab/templates",
  nutrition: "/?surface=nutrition",
  clients: "/?surface=clients",
} as const;

export interface NavDestination {
  id: "profile" | "lab" | "nutrition" | "clients";
  href: string;
  label: string;
  description: string;
  eyebrow: string;
  surface: DashboardSurfaceEvent | null;
  compact?: boolean;
}

export const sidebarDestinations: NavDestination[] = [
  {
    id: "profile",
    href: NAV_HREFS.profile,
    label: NAV_LABELS.profile,
    description: "Perfil y telemetría",
    eyebrow: "home",
    surface: "profile",
  },
  {
    id: "lab",
    href: NAV_HREFS.lab,
    label: NAV_LABELS.lab,
    description: "Rutinas y catálogo",
    eyebrow: "train",
    surface: null,
  },
  {
    id: "nutrition",
    href: NAV_HREFS.nutrition,
    label: NAV_LABELS.nutrition,
    description: "Ingesta y recuperación",
    eyebrow: "food",
    surface: "nutrition",
  },
  {
    id: "clients",
    href: NAV_HREFS.clients,
    label: NAV_LABELS.clients,
    description: "Atletas",
    eyebrow: "people",
    surface: "clients",
    compact: true,
  },
];

export const mobileDestinations = sidebarDestinations.filter((item) => item.id !== "clients");

export function isNavItemActive(
  pathname: string,
  surface: string | null,
  item: Pick<NavDestination, "id">,
) {
  if (item.id === "lab") {
    return pathname === "/lab" || pathname.startsWith("/lab/");
  }

  if (pathname !== "/") {
    return false;
  }

  if (item.id === "nutrition") {
    return surface === "nutrition";
  }

  if (item.id === "clients") {
    return surface === "clients";
  }

  return surface !== "nutrition" && surface !== "clients";
}

export function getSurfaceLabel(surface: DashboardSurfaceEvent) {
  return NAV_LABELS[surface];
}
