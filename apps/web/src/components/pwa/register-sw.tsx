"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __musculatorSwRegistration?: ServiceWorkerRegistration | null;
    __musculatorSwError?: string | null;
  }
}

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      window.__musculatorSwError = "serviceWorker no está disponible en este navegador.";
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        window.__musculatorSwRegistration = registration;
        window.__musculatorSwError = null;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        window.__musculatorSwError = message;
        console.error("[musculator] service worker registration failed", error);
      });
  }, []);

  return null;
}
