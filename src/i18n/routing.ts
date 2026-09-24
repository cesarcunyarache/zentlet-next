import { defineRouting } from "next-intl/routing";

/*
 * Idiomas de la app. Para añadir uno: agrégalo a `locales`, a `intlLocales`
 * y crea `src/locales/<locale>/` con los mismos archivos que `es/`.
 */
export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  // el idioma por defecto conserva las URLs de siempre: /, /admin, /auth/...
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

/**
 * Etiqueta regional para Intl, <html lang> y Open Graph. Los montos se
 * formatean como hasta ahora (`1,250.50`); `es` a secas daría `1250,50`.
 */
export const intlLocales: Record<Locale, string> = {
  es: "es-PE",
  en: "en-US",
};

/** Cada idioma con su propio nombre: así lo reconoce quien lo habla. */
export const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
};
