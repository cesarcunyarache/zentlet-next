import type { Metadata, Viewport } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getLandingContent } from "@/features/landing/content";
import { LandingPage } from "@/features/landing/components/landing-page";
import { buildLandingMetadata } from "@/features/landing/lib/seo";
import { routing } from "@/i18n/routing";

interface HomeProps {
  params: Promise<{ locale: string }>;
}

async function resolveLocale(params: HomeProps["params"]) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return locale;
}

export async function generateMetadata({ params }: HomeProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return buildLandingMetadata(await getLandingContent(locale), locale);
}

export const viewport: Viewport = {
  themeColor: "#f6f4f9",
};

export default async function Home({ params }: HomeProps) {
  const locale = await resolveLocale(params);
  // mantiene la landing estática: el idioma sale de la URL, no de headers
  setRequestLocale(locale);

  return <LandingPage content={await getLandingContent(locale)} />;
}
