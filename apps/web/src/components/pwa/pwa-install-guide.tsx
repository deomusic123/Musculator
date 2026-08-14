"use client";

import { useEffect, useState } from "react";

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

export function PwaInstallGuide() {
  const [hasMounted, setHasMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

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

  if (!hasMounted || dismissed || isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <section className="mb-3 rounded-2xl border border-white/10 bg-[#0b1420] px-3 py-2.5 text-white shadow-[0_10px_30px_rgba(2,6,23,0.2)] sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm text-white/82">Utilizalo como app.</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void runInstallPrompt()}
            disabled={isInstalling}
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#4cb894] px-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-[#63c7a5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isInstalling ? "Abriendo..." : "Instalar"}
          </button>
          <button
            type="button"
            onClick={hideGuide}
            aria-label="Cerrar guía de instalación"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 text-base text-white/80 transition hover:bg-white/12"
          >
            ×
          </button>
        </div>
      </div>
    </section>
  );
}
