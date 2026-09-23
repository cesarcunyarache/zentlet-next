import { es } from "./es";
import type { LandingContent } from "./types";

/*
 * Punto único de acceso al contenido. Para añadir un idioma:
 *   1. crea `en.ts` exportando un `LandingContent`;
 *   2. regístralo en `dictionaries`;
 *   3. pásale el locale a `getLandingContent` (p. ej. desde app/[lang]).
 */
const dictionaries = { es } satisfies Record<string, LandingContent>;

export type Locale = keyof typeof dictionaries;

export const DEFAULT_LOCALE: Locale = "es";
export const LOCALES = Object.keys(dictionaries) as Locale[];

export function getLandingContent(locale: Locale = DEFAULT_LOCALE): LandingContent {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export type * from "./types";
