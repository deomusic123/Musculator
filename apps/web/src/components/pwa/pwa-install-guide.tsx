"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

const dismissedStorageKey = "musculator:pwa-install-guide-dismissed";

function isRunningStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  const byDisplayMode = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return byDisplayMode || iosStandalone;
}

function detectDeviceFamily() {
  if (typeof navigator === "undefined") {
    return "generic" as const;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isAppleMobile = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);

  if (isAppleMobile) {
    return "ios" as const;
  }

  if (isAndroid) {
    return "android" as const;
  }

  return "generic" as const;
}

export function PwaInstallGuide() {
  const [hasMounted, setHasMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const deviceFamily = useMemo(() => detectDeviceFamily(), []);

  useEffect(() => {
    setHasMounted(true);
    setIsInstalled(isRunningStandalone());

    try {
      setDismissed(window.localStorage.getItem(dismissedStorageKey) === "1");
    } catch {
      setDismissed(false);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const hideGuide = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(dismissedStorageKey, "1");
    } catch {
      // Ignore storage failures; we still hide for current render.
    }
  };

  const runInstallPrompt = async () => {
    if (!deferredPrompt) {
      return;
    }

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return;
      }

      setDeferredPrompt(null);
    } finally {
      setIsInstalling(false);
    }
  };

  if (!hasMounted || dismissed || isInstalled) {
    return null;
  }

  return (
    <section className="mb-4 rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,#0d1724_0%,#09111b_100%)] p-4 text-white shadow-[0_16px_48px_rgba(2,6,23,0.24)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Instalar app</p>
          <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">Usá Musculator como app en tu celular</h2>
          <p className="mt-2 text-sm leading-6 text-white/72">
            Al instalarla, abre más rápido, se ve mejor en pantalla completa y queda junto a tus apps.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {deferredPrompt ? (
            <button
              type="button"
              onClick={() => void runInstallPrompt()}
              disabled={isInstalling}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#4cb894] px-4 text-sm font-semibold text-slate-950 transition hover:bg-[#63c7a5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isInstalling ? "Abriendo..." : "Instalar ahora"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={hideGuide}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 bg-white/8 px-4 text-sm font-medium text-white/85 transition hover:bg-white/12"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-[1.1rem] border border-white/10 bg-white/6 p-3.5 text-sm leading-6 text-white/80">
        {deviceFamily === "ios" ? (
          <p>
            iPhone/iPad: abrí esta web en Safari, tocá <strong>Compartir</strong> y luego{" "}
            <strong>Agregar a pantalla de inicio</strong>.
          </p>
        ) : deviceFamily === "android" ? (
          <p>
            Android: abrí el menú del navegador (<strong>⋮</strong>) y elegí{" "}
            <strong>Instalar app</strong> o <strong>Agregar a pantalla principal</strong>.
          </p>
        ) : (
          <p>
            En navegador: abrí el menú principal y buscá <strong>Instalar app</strong> o{" "}
            <strong>Agregar a pantalla de inicio</strong>.
          </p>
        )}
      </div>
    </section>
  );
}
