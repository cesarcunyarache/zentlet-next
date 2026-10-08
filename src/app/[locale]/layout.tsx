import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { clientMessages } from "@/i18n/client-messages";
import { siteConfig } from "@/lib/site";
import { ServiceWorkerRegister } from "@/core/offline/service-worker-register";
import { AnalyticsConsentBanner } from "@/core/components/analytics-consent-banner";
import { themeInitScript } from "@/core/theme/theme";
import { routing } from "@/i18n/routing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// sin "cover", iOS instalada da 0 en env(safe-area-inset-*) y los pies quedan bajo la barra de inicio
export const viewport: Viewport = { viewportFit: "cover" };

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

// un HTML estático por idioma
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });

  return {
    metadataBase: new URL(siteConfig.url),
    title: "Zentlet",
    description: t("metadata.description"),
    // instalada en iOS: pantalla completa y su propio icono
    appleWebApp: { capable: true, title: "Zentlet", statusBarStyle: "default" },
    icons: { apple: "/icons/apple-touch-icon.png" },
    manifest: locale === routing.defaultLocale ? "/manifest.webmanifest" : `/manifest.webmanifest?lang=${locale}`,
  };
}

export default async function RootLayout({ children, params }: Readonly<LocaleLayoutProps>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = clientMessages(await getMessages());

  return (
    /* Extensiones de navegador (LanguageTool y similares) añaden atributos
       a <html> antes de que React hidrate; el aviso no señala un problema
       nuestro y sólo afecta a los atributos de este elemento. */
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>{children}</QueryProvider>
          <AnalyticsConsentBanner />
        </NextIntlClientProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
