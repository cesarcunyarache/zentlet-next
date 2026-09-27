import { z } from "zod";
import { routing } from "@/i18n/routing";
import { CURRENCY_CODES, DEFAULT_CURRENCY } from "../lib/currency";

export const DEFAULT_TIMEZONE = "America/Lima";

function isTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const language = z.enum(routing.locales);
const currency = z.enum(CURRENCY_CODES);
const timezone = z.string().min(1).max(64).refine(isTimezone, "Zona horaria no válida");

/**
 * Flags de interfaz sin columna propia. Cada clave nueva lleva su
 * `.default()`: las filas antiguas no la tienen y no hace falta migrar.
 */
export const preferenceExtrasSchema = z.object({});

export const preferenceUpdateSchema = z
  .object({ language, currency, timezone, extras: preferenceExtrasSchema })
  .partial()
  .strict()
  .refine((update) => Object.keys(update).length > 0, "Sin cambios");

/** Lectura de la base de datos: un valor fuera de lo admitido vuelve al de por defecto. */
export const preferencesSchema = z.object({
  language: language.catch(routing.defaultLocale),
  currency: currency.catch(DEFAULT_CURRENCY),
  timezone: timezone.catch(DEFAULT_TIMEZONE),
  extras: preferenceExtrasSchema.catch({}),
});

export type Preferences = z.infer<typeof preferencesSchema>;
export type PreferenceUpdate = z.infer<typeof preferenceUpdateSchema>;
