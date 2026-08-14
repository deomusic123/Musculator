export type BrowserFamily =
  | "chrome-ios"
  | "safari-ios"
  | "firefox-ios"
  | "edge-ios"
  | "chrome-android"
  | "samsung-internet"
  | "edge"
  | "chrome"
  | "firefox"
  | "safari"
  | "unknown";

export type DisplayModeKind = "standalone" | "fullscreen" | "minimal-ui" | "browser";

export type LaunchSurface =
  | "browser-tab"
  | "installed-pwa"
  | "possible-homescreen-bookmark"
  | "unknown";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

export const PWA_INSTALL_READY_EVENT = "musculator:install-ready";

declare global {
  interface Window {
    __musculatorSwRegistration?: ServiceWorkerRegistration | null;
    __musculatorSwError?: string | null;
    __musculatorDeferredPrompt?: BeforeInstallPromptEvent | null;
    __musculatorBeforeInstallPromptSeen?: boolean;
    __musculatorInstallChoice?: "accepted" | "dismissed" | null;
  }
}

export function detectIos(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent;
  const classicIos = /iPhone|iPad|iPod/i.test(ua);
  const iPadOsDesktopUa = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return classicIos || iPadOsDesktopUa;
}

export function detectAndroid(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android/i.test(navigator.userAgent);
}

export function detectBrowserFamily(): BrowserFamily {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const ua = navigator.userAgent;
  const ios = detectIos();

  if (ios && /CriOS/i.test(ua)) {
    return "chrome-ios";
  }
  if (ios && /FxiOS/i.test(ua)) {
    return "firefox-ios";
  }
  if (ios && /EdgiOS/i.test(ua)) {
    return "edge-ios";
  }
  if (ios && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\//i.test(ua)) {
    return "safari-ios";
  }
  if (/SamsungBrowser/i.test(ua)) {
    return "samsung-internet";
  }
  if (/Edg\//i.test(ua)) {
    return "edge";
  }
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua) && /Android/i.test(ua)) {
    return "chrome-android";
  }
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    return "chrome";
  }
  if (/Firefox\//i.test(ua)) {
    return "firefox";
  }
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Android/i.test(ua)) {
    return "safari";
  }

  return "unknown";
}

export function browserFamilyLabel(family: BrowserFamily): string {
  switch (family) {
    case "chrome-ios":
      return "Chrome iOS";
    case "safari-ios":
      return "Safari iOS";
    case "firefox-ios":
      return "Firefox iOS";
    case "edge-ios":
      return "Edge iOS";
    case "chrome-android":
      return "Chrome Android";
    case "samsung-internet":
      return "Samsung Internet";
    case "edge":
      return "Edge";
    case "chrome":
      return "Chrome";
    case "firefox":
      return "Firefox";
    case "safari":
      return "Safari";
    default:
      return "Desconocido";
  }
}

export function detectDisplayMode(): DisplayModeKind {
  if (typeof window === "undefined") {
    return "browser";
  }

  if (window.matchMedia("(display-mode: standalone)").matches) {
    return "standalone";
  }
  if (window.matchMedia("(display-mode: fullscreen)").matches) {
    return "fullscreen";
  }
  if (window.matchMedia("(display-mode: minimal-ui)").matches) {
    return "minimal-ui";
  }
  return "browser";
}

export function detectIosStandalone(): boolean | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return typeof standalone === "boolean" ? standalone : null;
}

export function isPWAInstalled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const fullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const iosStandalone = detectIosStandalone() === true;
  return standalone || fullscreen || iosStandalone;
}

export function subscribeToPwaInstallState(onChange: (installed: boolean) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const update = () => {
    if (isPWAInstalled()) {
      onChange(true);
    }
  };
  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  const fullscreenQuery = window.matchMedia("(display-mode: fullscreen)");

  standaloneQuery.addEventListener("change", update);
  fullscreenQuery.addEventListener("change", update);

  return () => {
    standaloneQuery.removeEventListener("change", update);
    fullscreenQuery.removeEventListener("change", update);
  };
}

export function captureDeferredPrompt(event: Event): BeforeInstallPromptEvent {
  event.preventDefault();
  const promptEvent = event as BeforeInstallPromptEvent;
  window.__musculatorDeferredPrompt = promptEvent;
  window.__musculatorBeforeInstallPromptSeen = true;
  window.dispatchEvent(new Event(PWA_INSTALL_READY_EVENT));
  return promptEvent;
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.__musculatorDeferredPrompt ?? null;
}

export function clearDeferredPrompt(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.__musculatorDeferredPrompt = null;
}

export function detectLaunchSurface(): LaunchSurface {
  if (typeof window === "undefined") {
    return "unknown";
  }

  if (isPWAInstalled()) {
    return "installed-pwa";
  }

  const displayMode = detectDisplayMode();
  if (displayMode === "browser") {
    return "browser-tab";
  }

  return "possible-homescreen-bookmark";
}

export function describeLaunchSurface(surface: LaunchSurface): string {
  switch (surface) {
    case "installed-pwa":
      return "PWA instalada (standalone/fullscreen o navigator.standalone).";
    case "browser-tab":
      return "Pestaña de navegador. Un bookmark de iOS también abre acá: no es PWA.";
    case "possible-homescreen-bookmark":
      return "No es standalone. Puede ser pestaña o atajo/bookmark.";
    default:
      return "No se pudo determinar.";
  }
}

export function describeIosInstaller(): string {
  if (!detectIos()) {
    return "No aplica: no es iOS.";
  }

  if (!isPWAInstalled()) {
    return "Todavía no está instalada. En iOS no se puede saber qué navegador la va a agregar hasta después del alta.";
  }

  return [
    "En iOS, una PWA del Home Screen corre en el contenedor WebKit de web app, no dentro de Chrome ni Safari.",
    "Por eso, una vez instalada, no hay API pública para distinguir “instalada desde Chrome” vs “instalada desde Safari”.",
  ].join(" ");
}
