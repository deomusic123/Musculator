"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

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
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setHasMounted(true);
    setIsInstalled(isRunningStandalone());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
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
    if (!deferredPrompt) {
      setInstallFeedback("Instalación no disponible todavía en este navegador.");
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
      setInstallFeedback("Instalación cancelada.");
    } finally {
      setIsInstalling(false);
    }
  };

  if (!hasMounted || isInstalled) {
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
            className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-semibold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-60 ${
              deferredPrompt
                ? "bg-[#4cb894] text-slate-950 hover:bg-[#63c7a5]"
                : "border border-[#4cb894]/45 bg-[#4cb894]/12 text-[#9cf3d3] hover:bg-[#4cb894]/20"
            }`}
          >
            {isInstalling ? "Abriendo..." : "Instalar"}
          </button>
        </div>
      </div>
      {installFeedback ? (
        <p className="mt-2 text-xs text-white/65">{installFeedback}</p>
      ) : null}
    </section>
  );
}
