import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * El service worker nunca se cachea en el navegador: así cada despliegue
   * se detecta en la siguiente visita. Recomendación de la guía PWA de Next.
   */
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
