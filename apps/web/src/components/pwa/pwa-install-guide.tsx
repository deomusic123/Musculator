"use client";

import { useEffect, useState } from "react";

function isRunningStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  const byDisplayMode = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return byDisplayMode || iosStandalone;
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

  useEffect(() => {
    setHasMounted(true);
    setIsInstalled(isRunningStandalone());
    setInstallFeedback(null);
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
      const openedShareSheet = await openShareSheetForInstall();

      if (!openedShareSheet) {
        setInstallFeedback("No se pudo abrir compartir en este navegador.");
      }
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
