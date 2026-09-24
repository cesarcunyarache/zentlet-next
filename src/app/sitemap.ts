import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Cada página en el idioma por defecto, con sus alternativas por idioma (hreflang). */
function entry(href: string, changeFrequency: "weekly" | "yearly", priority: number) {
  const url = (locale: (typeof routing.locales)[number]) => `${siteConfig.url}${getPathname({ href, locale })}`;

  return {
    url: url(routing.defaultLocale),
    changeFrequency,
    priority,
    alternates: {
      languages: Object.fromEntries(routing.locales.map((locale) => [locale, url(locale)])),
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const { routes } = siteConfig;

  return [
    entry(routes.home, "weekly", 1),
    entry(routes.signUp, "yearly", 0.6),
    entry(routes.signIn, "yearly", 0.4),
    entry(routes.privacy, "yearly", 0.2),
    entry(routes.terms, "yearly", 0.2),
  ];
}
