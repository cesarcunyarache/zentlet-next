import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import type { LandingContent } from "../content";

export function buildLandingMetadata(content: LandingContent): Metadata {
  const { meta, locale } = content;

  return {
    title: { absolute: meta.title },
    description: meta.description,
    keywords: meta.keywords,
    applicationName: siteConfig.name,
    alternates: { canonical: siteConfig.routes.home },
    openGraph: {
      type: "website",
      url: siteConfig.routes.home,
      siteName: siteConfig.name,
      title: meta.title,
      description: meta.description,
      locale: locale.replace("-", "_"),
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
