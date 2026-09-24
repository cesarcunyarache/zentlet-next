import { hasLocale, type Messages } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing, type Locale } from "./routing";

/** Un archivo por módulo en `src/locales/<locale>/`; cada uno es un namespace. */
const NAMESPACES = [
  "common",
  "auth",
  "landing",
  "transactions",
  "categories",
  "settings",
  "offline",
  "onboarding",
] as const satisfies readonly (keyof Messages)[];

async function loadMessages(locale: Locale) {
  const files = await Promise.all(
    NAMESPACES.map(async (namespace) => [
      namespace,
      (await import(`../locales/${locale}/${namespace}.json`)).default,
    ]),
  );
  return Object.fromEntries(files) as Messages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return { locale, messages: await loadMessages(locale) };
});
