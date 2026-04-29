import type { Metadata } from "next";
import { Source_Sans_3, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { AppNav } from "@/components/navigation/app-nav";
import { MobileRouteNav } from "@/components/navigation/mobile-route-nav";
import { GlobalOverlayProvider } from "@/components/overlays/global-overlay-provider";
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
  themeColor: "#0F172A",
  appleWebApp: {
    capable: true,
    title: "Musculator",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        <RegisterServiceWorker />
        <GlobalOverlayProvider>
          <main className="min-h-[100svh] overflow-x-hidden px-0 py-0 sm:px-4 sm:py-4 lg:px-8 lg:py-8">
            <div className="mx-auto flex min-h-[100svh] max-w-7xl gap-6">
              <AppNav />
              <div className="min-w-0 flex-1">{children}</div>
            </div>
            <MobileRouteNav />
          </main>
        </GlobalOverlayProvider>
      </body>
    </html>
  );
}
