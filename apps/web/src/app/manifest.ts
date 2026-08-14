import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Musculator",
    short_name: "Musculator",
    description: "Athlete OS para entrenamiento, telemetria y sesiones live de musculacion.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "es",
    orientation: "portrait-primary",
    background_color: "#0F172A",
    theme_color: "#0F172A",
    icons: [
      {
        src: "/icons/logo-any-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/logo-any-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/logo-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/logo-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
