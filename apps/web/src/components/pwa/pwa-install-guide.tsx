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

function isIOS() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function getCapturedInstallPrompt() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.__musculatorInstallPromptEvent ?? null;
}

function clearCapturedInstallPrompt() {
  if (typeof window === "undefined") {
    return;
  }

  window.__musculatorInstallPromptEvent = null;
}

async function openShareSheetForInstall() {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title: "Musculator",
      text: "Instalá Musculator como app.",
      url: window.location.href,
    });
    return true;
  } catch {
    return false;
  }
}

export function PwaInstallGuide() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    setHasMounted(true);
    setIsInstalled(isRunningStandalone());
    setInstallFeedback(null);
    setInstallPrompt(getCapturedInstallPrompt());

    const onInstallPromptReady = () => {
      setInstallPrompt(getCapturedInstallPrompt());
    };

    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as InstallPromptEvent;
      promptEvent.preventDefault();
      window.__musculatorInstallPromptEvent = promptEvent;
      setInstallPrompt(promptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      clearCapturedInstallPrompt();
      setInstallFeedback(null);
    };

    window.addEventListener("musculator:install-prompt-ready", onInstallPromptReady as EventListener);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener(
        "musculator:install-prompt-ready",
        onInstallPromptReady as EventListener,
      );
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
    setIsInstalling(true);
    try {
      let promptEvent = installPrompt ?? getCapturedInstallPrompt();

      if (!promptEvent) {
        await new Promise((resolve) => window.setTimeout(resolve, 220));
        promptEvent = getCapturedInstallPrompt();
      }

      if (promptEvent) {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        clearCapturedInstallPrompt();
        setInstallPrompt(null);

        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setInstallFeedback(null);
          return;
        }

        setInstallFeedback("Instalación cancelada.");
        return;
      }

      if (isIOS()) {
        const openedShareSheet = await openShareSheetForInstall();
        if (!openedShareSheet) {
          setInstallFeedback("No se pudo abrir compartir en Safari.");
        }
        return;
      }

      setInstallFeedback("El instalador nativo aún no está disponible.");
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
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#4cb894] px-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-[#63c7a5] disabled:cursor-not-allowed disabled:opacity-60"
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
