"use client";

import { useEffect, useState } from "react";
import { PwaInstallModal } from "@/components/pwa/pwa-install-modal";
import {
  captureDeferredPrompt,
  clearDeferredPrompt,
  detectBrowserFamily,
  getDeferredPrompt,
  isPWAInstalled,
  PWA_INSTALL_READY_EVENT,
  subscribeToPwaInstallState,
  type BeforeInstallPromptEvent,
  type BrowserFamily,
} from "@/lib/pwa/runtime";

export function PwaInstallGuide() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [browserFamily, setBrowserFamily] = useState<BrowserFamily>("unknown");

  useEffect(() => {
    setHasMounted(true);
    setIsInstalled(isPWAInstalled());
    setBrowserFamily(detectBrowserFamily());
    setDeferredPrompt(getDeferredPrompt());

    const onInstallReady = () => {
      setDeferredPrompt(getDeferredPrompt());
    };

    const onBeforeInstallPrompt = (event: Event) => {
      setDeferredPrompt(captureDeferredPrompt(event));
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDismissed(true);
      setGuideOpen(false);
      setDeferredPrompt(null);
      clearDeferredPrompt();
      window.__musculatorInstallChoice = "accepted";
    };

    window.addEventListener(PWA_INSTALL_READY_EVENT, onInstallReady);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    const unsubscribe = subscribeToPwaInstallState(setIsInstalled);

    return () => {
      window.removeEventListener(PWA_INSTALL_READY_EVENT, onInstallReady);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      unsubscribe();
    };
  }, []);

  const runNativeInstallPrompt = async () => {
    const activePrompt = deferredPrompt ?? getDeferredPrompt();
    if (!activePrompt) {
      return false;
    }

    setIsInstalling(true);
    try {
      await activePrompt.prompt();
      const choice = await activePrompt.userChoice;
      window.__musculatorInstallChoice = choice.outcome;
      console.info("[musculator:pwa] userChoice", choice.outcome);
      clearDeferredPrompt();
      setDeferredPrompt(null);

      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setDismissed(true);
        setGuideOpen(false);
      }

      return true;
    } catch (error) {
      console.info("[musculator:pwa] native prompt failed", error);
      return false;
    } finally {
      setIsInstalling(false);
    }
  };

  const onInstallClick = async () => {
    const usedNativePrompt = await runNativeInstallPrompt();
    if (usedNativePrompt) {
      return;
    }

    // iOS (and any browser without beforeinstallprompt): visual guide only.
    // Never call navigator.share() — that is Web Share API, not install.
    setGuideOpen(true);
  };

  if (!hasMounted || isInstalled || dismissed) {
    return null;
  }

  return (
    <>
      <section className="fixed inset-x-3 bottom-[calc(5.3rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-white/12 bg-[#0b1420]/96 px-3 py-2.5 text-white shadow-[0_12px_36px_rgba(2,6,23,0.35)] backdrop-blur xl:inset-x-auto xl:bottom-4 xl:right-4 xl:w-[360px]">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-white/88">Instalar MUSCULATOR</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onInstallClick()}
              disabled={isInstalling}
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#4cb894] px-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-[#63c7a5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isInstalling ? "Instalando..." : "Instalar"}
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
      </section>
      <PwaInstallModal open={guideOpen} browserFamily={browserFamily} onClose={() => setGuideOpen(false)} />
    </>
  );
}
