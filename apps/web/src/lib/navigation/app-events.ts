"use client";

export type DashboardSurfaceEvent = "profile" | "nutrition" | "clients";

const SURFACE_EVENT = "musculator:surface";
const LIVE_EVENT = "musculator:live";
const CHROME_LOCK_EVENT = "musculator:chrome-lock";

export function emitDashboardSurface(surface: DashboardSurfaceEvent) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(SURFACE_EVENT, { detail: surface }));
}

export function emitOpenLive() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(LIVE_EVENT));
}

export function subscribeDashboardSurface(handler: (surface: DashboardSurfaceEvent) => void) {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<DashboardSurfaceEvent>).detail;

    if (detail === "profile" || detail === "nutrition" || detail === "clients") {
      handler(detail);
    }
  };

  window.addEventListener(SURFACE_EVENT, listener);

  return () => window.removeEventListener(SURFACE_EVENT, listener);
}

export function subscribeOpenLive(handler: () => void) {
  window.addEventListener(LIVE_EVENT, handler);

  return () => window.removeEventListener(LIVE_EVENT, handler);
}

export function emitChromeLock(locked: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(CHROME_LOCK_EVENT, { detail: locked }));
}

export function subscribeChromeLock(handler: (locked: boolean) => void) {
  const listener = (event: Event) => {
    handler(Boolean((event as CustomEvent<boolean>).detail));
  };

  window.addEventListener(CHROME_LOCK_EVENT, listener);

  return () => window.removeEventListener(CHROME_LOCK_EVENT, listener);
}

export function softReplaceQuery(query: Record<string, string | null>) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);

  Object.entries(query).forEach(([key, value]) => {
    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });

  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
