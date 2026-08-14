"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

declare global {
  interface Window {
    __musculatorInstallPromptEvent?: InstallPromptEvent | null;
  }
}

function isRunningStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  const byDisplayMode = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return byDisplayMode || iosStandalone;
}

function isIOSBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

export function PwaInstallGuide() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    setHasMounted(true);
    setIsInstalled(isRunningStandalone());
    setDismissed(false);

    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as InstallPromptEvent;
      promptEvent.preventDefault();
      setInstallPrompt(promptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDismissed(true);
      setInstallPrompt(null);
      setInstallFeedback(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!installFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setInstallFeedback(null);
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [installFeedback]);

  const runInstallPrompt = async () => {
    if (!installPrompt) {
      setInstallFeedback(
        isIOSBrowser()
          ? "iOS no permite instalación directa por botón en web. Usá Safari > Compartir > Añadir a inicio."
          : "Instalador aún no disponible. Probá recargar y volver a tocar Instalar.",
      );
      return;
    }

    setIsInstalling(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);

      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setDismissed(true);
        setInstallFeedback(null);
        return;
      }

      setInstallFeedback("Instalación cancelada.");
    } finally {
      setIsInstalling(false);
    }
  };

  if (!hasMounted || isInstalled || dismissed) {
    return null;
  }

  return (
    <section className="fixed inset-x-3 bottom-[calc(5.3rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-white/12 bg-[#0b1420]/96 px-3 py-2.5 text-white shadow-[0_12px_36px_rgba(2,6,23,0.35)] backdrop-blur xl:inset-x-auto xl:bottom-4 xl:right-4 xl:w-[360px]">
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
            onClick={() => setDismissed(true)}
            aria-label="Cerrar aviso de instalación"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/6 text-sm text-white/75 transition hover:bg-white/12"
          >
            ×
          </button>
        </div>
      </div>
      {installFeedback ? (
        <p className="mt-2 text-xs text-white/65">{installFeedback}</p>
      ) : null}
    </section>
  );
}
