import type { Locale } from "@/i18n/routing";
import type { CurrencyCode } from "./currency";
import type { PreferenceUpdate, Preferences } from "../schemas/preference.schema";

export interface DevicePreferences {
  language: Locale;
  currency: CurrencyCode;
  timezone: string;
}

/**
 * Qué hacer al abrir la app. Sin fila en el servidor (cuenta nueva o previa
 * a esta tabla), se crea con lo que ya usa el dispositivo. Con fila, el
 * idioma y la moneda de la cuenta mandan y la zona horaria sigue al
 * dispositivo. Los cambios pendientes de confirmar mandan sobre ambos y se
 * reenvían.
 */
export function planPreferenceSync(
  server: Preferences | null,
  device: DevicePreferences,
  pending: PreferenceUpdate = {},
): { language: Locale; currency: CurrencyCode; update: PreferenceUpdate | null } {
  if (!server) {
    return {
      language: pending.language ?? device.language,
      currency: pending.currency ?? device.currency,
      update: { ...device, ...pending },
    };
  }

  const update: PreferenceUpdate = { ...pending };
  if (server.timezone !== device.timezone) update.timezone = device.timezone;

  return {
    language: pending.language ?? server.language,
    currency: pending.currency ?? server.currency,
    update: Object.keys(update).length > 0 ? update : null,
  };
}
