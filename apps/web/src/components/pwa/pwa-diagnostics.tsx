"use client";

import { useEffect, useState } from "react";
import {
  browserFamilyLabel,
  detectAndroid,
  detectBrowserFamily,
  detectDisplayMode,
  detectIos,
  detectIosStandalone,
  detectLaunchSurface,
  describeIosInstaller,
  describeLaunchSurface,
  getDeferredPrompt,
  PWA_INSTALL_READY_EVENT,
} from "@/lib/pwa/runtime";

type ManifestCheck = {
  ok: boolean;
  status: number | null;
  contentType: string | null;
  name: string | null;
  shortName: string | null;
  startUrl: string | null;
  scope: string | null;
  id: string | null;
  display: string | null;
  iconCount: number;
  error: string | null;
};

type ServiceWorkerCheck = {
  apiAvailable: boolean;
  registered: boolean;
  scope: string | null;
  scriptUrl: string | null;
  state: string | null;
  error: string | null;
};

type Diagnostics = {
  browser: string;
  ios: boolean;
  android: boolean;
  displayMode: string;
  standalone: boolean;
  fullscreen: boolean;
  iosStandalone: string;
  launchSurface: string;
  launchSurfaceNote: string;
  installerNote: string;
  https: boolean;
  manifest: ManifestCheck;
  serviceWorker: ServiceWorkerCheck;
  beforeInstallPromptSeen: boolean;
  deferredPrompt: boolean;
  installChoice: string;
  pushManager: boolean;
  notificationApi: boolean;
  notificationPermission: string;
  pushSubscription: string;
};

const emptyManifest: ManifestCheck = {
  ok: false,
  status: null,
  contentType: null,
  name: null,
  shortName: null,
  startUrl: null,
  scope: null,
  id: null,
  display: null,
  iconCount: 0,
  error: null,
};

function shouldShowDiagnostics(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const debugQuery = new URLSearchParams(window.location.search).get("pwa-debug") === "1";
  return process.env.NODE_ENV === "development" || debugQuery;
}

async function inspectManifest(): Promise<ManifestCheck> {
  try {
    const response = await fetch("/manifest.webmanifest", { cache: "no-store" });
    const contentType = response.headers.get("content-type");
    const body = (await response.json()) as Record<string, unknown>;
    const icons = Array.isArray(body.icons) ? body.icons : [];

    return {
      ok: response.ok && Boolean(body.name) && Boolean(body.start_url) && Boolean(body.display),
      status: response.status,
      contentType,
      name: typeof body.name === "string" ? body.name : null,
      shortName: typeof body.short_name === "string" ? body.short_name : null,
      startUrl: typeof body.start_url === "string" ? body.start_url : null,
      scope: typeof body.scope === "string" ? body.scope : null,
      id: typeof body.id === "string" ? body.id : null,
      display: typeof body.display === "string" ? body.display : null,
      iconCount: icons.length,
      error: null,
    };
  } catch (error) {
    return {
      ...emptyManifest,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function inspectServiceWorker(): Promise<ServiceWorkerCheck> {
  if (!("serviceWorker" in navigator)) {
    return {
      apiAvailable: false,
      registered: false,
      scope: null,
      scriptUrl: null,
      state: null,
      error: "serviceWorker no está en navigator.",
    };
  }

  try {
    const registration =
      (await navigator.serviceWorker.getRegistration("/")) ??
      (await navigator.serviceWorker.getRegistration("/sw.js"));
    const worker = registration?.active ?? registration?.waiting ?? registration?.installing ?? null;

    return {
      apiAvailable: true,
      registered: Boolean(registration),
      scope: registration?.scope ?? null,
      scriptUrl: worker?.scriptURL ?? null,
      state: worker?.state ?? registration?.active?.state ?? null,
      error: window.__musculatorSwError ?? null,
    };
  } catch (error) {
    return {
      apiAvailable: true,
      registered: false,
      scope: null,
      scriptUrl: null,
      state: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function inspectPushSubscription(): Promise<string> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "no disponible";
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? subscription.endpoint : "ninguna";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function collectDiagnostics(): Promise<Diagnostics> {
  const family = detectBrowserFamily();
  const launchSurface = detectLaunchSurface();
  const iosStandalone = detectIosStandalone();
  const [manifest, serviceWorker, pushSubscription] = await Promise.all([
    inspectManifest(),
    inspectServiceWorker(),
    inspectPushSubscription(),
  ]);

  return {
    browser: browserFamilyLabel(family),
    ios: detectIos(),
    android: detectAndroid(),
    displayMode: detectDisplayMode(),
    standalone: window.matchMedia("(display-mode: standalone)").matches,
    fullscreen: window.matchMedia("(display-mode: fullscreen)").matches,
    iosStandalone: iosStandalone === null ? "n/a" : String(iosStandalone),
    launchSurface,
    launchSurfaceNote: describeLaunchSurface(launchSurface),
    installerNote: describeIosInstaller(),
    https: window.isSecureContext,
    manifest,
    serviceWorker,
    beforeInstallPromptSeen: Boolean(window.__musculatorBeforeInstallPromptSeen),
    deferredPrompt: Boolean(getDeferredPrompt()),
    installChoice: window.__musculatorInstallChoice ?? "—",
    pushManager: "PushManager" in window,
    notificationApi: "Notification" in window,
    notificationPermission: "Notification" in window ? Notification.permission : "n/a",
    pushSubscription,
  };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2 border-b border-white/8 py-1.5 last:border-b-0">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-white/42">{label}</dt>
      <dd className="break-words text-xs text-white/86">{value}</dd>
    </div>
  );
}

export function PwaDiagnostics() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const show = shouldShowDiagnostics();
    setVisible(show);
    setOpen(new URLSearchParams(window.location.search).get("pwa-debug") === "1");

    if (!show) {
      return;
    }

    const refresh = () => {
      void collectDiagnostics()
        .then(setDiagnostics)
        .catch((caught: unknown) => {
          setError(caught instanceof Error ? caught.message : String(caught));
        });
    };

    refresh();
    window.addEventListener(PWA_INSTALL_READY_EVENT, refresh);
    window.addEventListener("appinstalled", refresh);

    return () => {
      window.removeEventListener(PWA_INSTALL_READY_EVENT, refresh);
      window.removeEventListener("appinstalled", refresh);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[80] w-[min(24rem,calc(100vw-1.5rem))]">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          void collectDiagnostics().then(setDiagnostics);
        }}
        className="ml-auto flex h-8 items-center rounded-full border border-cyan-300/30 bg-[#07212b]/92 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100"
      >
        {open ? "Cerrar PWA diag" : "PWA diag"}
      </button>
      {open ? (
        <section className="mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/12 bg-[#07131d]/96 p-3 text-white shadow-[0_16px_40px_rgba(2,6,23,0.45)] backdrop-blur">
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
          {diagnostics ? (
            <dl>
              <Row label="Navegador" value={diagnostics.browser} />
              <Row label="iOS" value={diagnostics.ios ? "sí" : "no"} />
              <Row label="Android" value={diagnostics.android ? "sí" : "no"} />
              <Row label="Standalone" value={diagnostics.standalone ? "sí" : "no"} />
              <Row label="Fullscreen" value={diagnostics.fullscreen ? "sí" : "no"} />
              <Row label="Display mode" value={diagnostics.displayMode} />
              <Row label="iOS standalone" value={diagnostics.iosStandalone} />
              <Row label="Superficie" value={diagnostics.launchSurface} />
              <Row label="Qué es" value={diagnostics.launchSurfaceNote} />
              <Row label="Instalador iOS" value={diagnostics.installerNote} />
              <Row label="HTTPS" value={diagnostics.https ? "sí" : "no"} />
              <Row
                label="Manifest"
                value={
                  diagnostics.manifest.ok
                    ? `ok · ${diagnostics.manifest.status}`
                    : `error · ${diagnostics.manifest.error ?? diagnostics.manifest.status ?? "falló"}`
                }
              />
              <Row label="Content-Type" value={diagnostics.manifest.contentType ?? "—"} />
              <Row label="manifest id" value={diagnostics.manifest.id ?? "—"} />
              <Row label="manifest scope" value={diagnostics.manifest.scope ?? "—"} />
              <Row label="start_url" value={diagnostics.manifest.startUrl ?? "—"} />
              <Row label="display" value={diagnostics.manifest.display ?? "—"} />
              <Row
                label="Service Worker"
                value={diagnostics.serviceWorker.registered ? "registrado" : diagnostics.serviceWorker.error ?? "no"}
              />
              <Row label="SW scope" value={diagnostics.serviceWorker.scope ?? "—"} />
              <Row label="SW script" value={diagnostics.serviceWorker.scriptUrl ?? "—"} />
              <Row
                label="beforeinstallprompt"
                value={diagnostics.beforeInstallPromptSeen ? "disponible / visto" : "no"}
              />
              <Row label="deferredPrompt" value={diagnostics.deferredPrompt ? "disponible" : "no"} />
              <Row label="userChoice" value={diagnostics.installChoice} />
              <Row label="PushManager" value={diagnostics.pushManager ? "disponible" : "no"} />
              <Row label="Notification" value={diagnostics.notificationApi ? "disponible" : "no"} />
              <Row label="Permiso" value={diagnostics.notificationPermission} />
              <Row label="PushSubscription" value={diagnostics.pushSubscription} />
            </dl>
          ) : (
            <p className="text-xs text-white/60">Leyendo diagnóstico…</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
