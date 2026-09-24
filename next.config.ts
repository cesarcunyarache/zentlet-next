import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

const withNextIntl = createNextIntlPlugin();

/*
 * Cabeceras de seguridad para todas las rutas:
 * - la app no puede incrustarse en otra web (clickjacking);
 * - el navegador no adivina tipos de archivo;
 * - otras webs no reciben la URL completa de la app;
 * - el micrófono (dictado) sólo lo puede pedir la propia app; el resto de
 *   APIs sensibles quedan desactivadas.
 * HSTS sólo en producción: en local se sirve por http.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      /*
       * El service worker nunca se cachea en el navegador: así cada despliegue
       * se detecta en la siguiente visita. Recomendación de la guía PWA de Next.
       */
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

/*
 * Sentry sólo toca el build si está configurado: instrumentación de
 * servidor y, con `SENTRY_AUTH_TOKEN`, subida de source maps (org, proyecto
 * y token se leen de `SENTRY_ORG`, `SENTRY_PROJECT` y `SENTRY_AUTH_TOKEN`).
 * Sin DSN la configuración es exactamente la de siempre.
 */
const sentryEnabled = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

const config = withNextIntl(nextConfig);

export default sentryEnabled
  ? withSentryConfig(config, {
      silent: !process.env.CI,
      telemetry: false,
      widenClientFileUpload: true,
    })
  : config;
