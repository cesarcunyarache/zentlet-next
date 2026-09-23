import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { siteConfig } from "@/lib/site";
import { ServiceWorkerRegister } from "@/core/offline/service-worker-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: "Zentlet",
  description: "Zentlet es una plataforma de finanzas personales.",
  // instalada en iOS: pantalla completa y su propio icono
  appleWebApp: { capable: true, title: "Zentlet", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* Extensiones de navegador (LanguageTool y similares) añaden atributos
       a <html> antes de que React hidrate; el aviso no señala un problema
       nuestro y sólo afecta a los atributos de este elemento. */
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
