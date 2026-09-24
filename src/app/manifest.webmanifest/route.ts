import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

/*
 * Manifest de la app instalable, en el idioma de la página que lo enlaza
 * (`?lang=en`). Al abrir desde el icono entra directo a la app.
 */

const COPY: Record<Locale, { name: string; description: string }> = {
  es: { name: "Zentlet · Tus gastos, claros", description: "Registra tus gastos en segundos, también sin conexión." },
  en: { name: "Zentlet · Your expenses, clear", description: "Record your expenses in seconds, even offline." },
};

function manifest(locale: Locale): MetadataRoute.Manifest {
  return {
    ...COPY[locale],
    short_name: "Zentlet",
    lang: locale,
    start_url: getPathname({ href: siteConfig.routes.app, locale }),
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

export function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get("lang");
  const locale = routing.locales.find((candidate) => candidate === lang) ?? routing.defaultLocale;
  return Response.json(manifest(locale), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
