import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Musculator",
    short_name: "Musculator",
    description: "Athlete OS para entrenamiento, telemetria y sesiones live de musculacion.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0F172A",
    theme_color: "#0F172A",
    icons: [
      {
        src: "/logo.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
