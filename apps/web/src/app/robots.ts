import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { routing } from "@/i18n/routing";

// la app privada en cualquier idioma: /admin/, /en/admin/…
const privatePaths = ["", ...routing.locales.map((locale) => `/${locale}`)].map(
  (prefix) => `${prefix}${siteConfig.routes.app}/`,
);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...privatePaths, "/api/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
