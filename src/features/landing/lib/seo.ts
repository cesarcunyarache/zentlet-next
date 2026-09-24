import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { getPathname } from "@/i18n/navigation";
import { intlLocales, routing, type Locale } from "@/i18n/routing";
import type { LandingContent } from "../content";

const toOgLocale = (tag: string) => tag.replace("-", "_");

/** URL de la home en cada idioma, para canonical y hreflang. */
function homeAlternates() {
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, getPathname({ href: siteConfig.routes.home, locale })]),
  );
  return { ...languages, "x-default": languages[routing.defaultLocale] };
}

export function buildLandingMetadata(content: LandingContent, lang: Locale): Metadata {
  const { meta, locale } = content;
  const url = getPathname({ href: siteConfig.routes.home, locale: lang });

  return {
    title: { absolute: meta.title },
    description: meta.description,
    keywords: meta.keywords,
    applicationName: siteConfig.name,
    alternates: { canonical: url, languages: homeAlternates() },
    openGraph: {
      type: "website",
      url,
      siteName: siteConfig.name,
      title: meta.title,
      description: meta.description,
      locale: toOgLocale(locale),
      alternateLocale: routing.locales
        .filter((other) => other !== lang)
        .map((other) => toOgLocale(intlLocales[other])),
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
    robots: { index: true, follow: true },
  };
}

/** Datos estructurados: la app y las preguntas frecuentes (rich results). */
export function buildLandingJsonLd(content: LandingContent) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: siteConfig.name,
        url: siteConfig.url,
        description: content.meta.description,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        inLanguage: content.locale,
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faq.items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}
