import type { Metadata } from "next";
import { Source_Sans_3, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
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
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
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
        <GlobalOverlayProvider>{children}</GlobalOverlayProvider>
      </body>
    </html>
  );
}
