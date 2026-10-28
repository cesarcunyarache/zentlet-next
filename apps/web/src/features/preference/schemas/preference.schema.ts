import { z } from "zod";
import { routing } from "@/i18n/routing";
import { CURRENCY_CODES, DEFAULT_CURRENCY } from "../lib/currency";

export const DEFAULT_TIMEZONE = "America/Lima";

const TIMEZONE_MAX_LENGTH = 64;

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
const timezone = z.string().min(1).max(TIMEZONE_MAX_LENGTH).refine(isTimezone, "Zona horaria no válida");

const preferenceExtrasSchema = z.object({});

export const preferenceUpdateSchema = z
  .object({ language, currency, timezone, extras: preferenceExtrasSchema })
  .partial()
  .strict()
  .refine((update) => Object.keys(update).length > 0, "Sin cambios");

export const preferencesSchema = z.object({
  language: language.catch(routing.defaultLocale),
  currency: currency.catch(DEFAULT_CURRENCY),
  timezone: timezone.catch(DEFAULT_TIMEZONE),
  extras: preferenceExtrasSchema.catch({}),
});

export type Preferences = z.infer<typeof preferencesSchema>;
export type PreferenceUpdate = z.infer<typeof preferenceUpdateSchema>;
