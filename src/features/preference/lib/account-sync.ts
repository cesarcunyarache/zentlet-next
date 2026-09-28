import { accountService } from "@/features/account/services/account.service";
import { getApiErrorStatus } from "@/core/services/api-error";
import { isNetworkError } from "@/core/offline/sync-policy";
import { reportClientError } from "@/lib/observability/client";
import type { Locale } from "@/i18n/routing";
import { DEFAULT_CURRENCY } from "./currency";
import { getDeviceCurrency, setDeviceCurrency } from "./device-currency";
import { readPendingPreferences } from "./pending";
import { savePreferences } from "./save";
import { planPreferenceSync } from "./sync";

export interface PreferenceSyncOptions {
  userId: string;
  /** El idioma de la URL en ese momento: puede cambiar mientras responde el servidor. */
  currentLocale: () => Locale;
  switchLanguage: (language: Locale) => void;
  cancelled: () => boolean;
}

/**
 * Cuentas ya alineadas con el servidor en esta visita. Cambiar de idioma
 * vuelve a montar el layout; sin esto cada cambio repetiría la lectura.
 */
const synced = new Set<string>();

/** Lee las preferencias de la cuenta y alinea el dispositivo con ellas. */
export async function syncPreferences({ userId, currentLocale, switchLanguage, cancelled }: PreferenceSyncOptions) {
  // un cambio recién confirmado ya no está pendiente, pero la
  // respuesta del servidor pudo salir antes: lo leído al empezar también cuenta
  const pendingBefore = readPendingPreferences(userId);
  const currencyBefore = getDeviceCurrency(userId);
  const localeBefore = currentLocale();
  const server = await accountService.getPreferences();
  if (cancelled()) return;

  const locale = currentLocale();
  const currencyNow = getDeviceCurrency(userId);
  const pending = { ...pendingBefore, ...readPendingPreferences(userId) };
  // lo elegido mientras se esperaba al servidor manda sobre su respuesta
  if (currencyNow !== null && currencyNow !== currencyBefore) pending.currency = currencyNow;
  if (locale !== localeBefore) pending.language = locale;

  const device = {
    language: locale,
    currency: currencyNow ?? DEFAULT_CURRENCY,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  const { language, currency, update } = planPreferenceSync(server, device, pending);
  synced.add(userId);
  setDeviceCurrency(userId, currency);
  if (language !== locale) switchLanguage(language);
  if (update) await savePreferences(userId, update);
}

/** Reenvía lo que el servidor aún no confirmó (p. ej. al volver la conexión). */
export async function flushPendingPreferences(userId: string) {
  const pending = readPendingPreferences(userId);
  if (Object.keys(pending).length > 0) await savePreferences(userId, pending);
}

/** La primera vez en la visita, sincroniza; después sólo reenvía lo pendiente. */
export function runPreferenceSync(options: PreferenceSyncOptions) {
  const work = synced.has(options.userId) ? flushPendingPreferences(options.userId) : syncPreferences(options);
  return work.catch(reportPreferenceSyncError);
}

/**
 * Sin red o con la sesión caducada se reintenta más tarde; lo demás es un
 * fallo real. Se reporta un error propio y no el de Axios, que lleva el
 * contenido de la petición.
 */
function reportPreferenceSyncError(error: unknown) {
  const status = getApiErrorStatus(error);
  if (isNetworkError(error) || status === 401) return;
  const failure = new Error(`Preference sync failed (${status ?? "none"})`);
  failure.name = "PreferenceSyncError";
  reportClientError(failure);
}
