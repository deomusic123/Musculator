import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { GlobalOverlayProvider } from "@/components/overlays/global-overlay-provider";
import { PwaDiagnostics } from "@/components/pwa/pwa-diagnostics";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Musculator",
  description:
    "Base platform for precision nutrition, biomechanical training logs and readiness analytics.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/logo-any-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/logo-any-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Musculator",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F172A",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        <Script id="musculator-install-capture" strategy="beforeInteractive">
          {`(() => {
  if (typeof window === "undefined") return;
  window.__musculatorDeferredPrompt = window.__musculatorDeferredPrompt ?? null;
  window.__musculatorBeforeInstallPromptSeen = Boolean(window.__musculatorBeforeInstallPromptSeen);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.__musculatorDeferredPrompt = event;
    window.__musculatorBeforeInstallPromptSeen = true;
    window.dispatchEvent(new Event("musculator:install-ready"));
  });
})();`}
        </Script>
        <RegisterServiceWorker />
        <PwaDiagnostics />
        <GlobalOverlayProvider>{children}</GlobalOverlayProvider>
      </body>
    </html>
  );
}
