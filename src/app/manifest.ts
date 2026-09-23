import type { MetadataRoute } from "next";

/** Instalable: al abrir desde el icono entra directo a la app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zentlet · Tus gastos, claros",
    short_name: "Zentlet",
    description: "Registra tus gastos en segundos, también sin conexión.",
    lang: "es",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f4f9",
    theme_color: "#f6f4f9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
