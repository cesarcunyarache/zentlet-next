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
  currentLocale: () => Locale;
  switchLanguage: (language: Locale) => void;
  cancelled: () => boolean;
}

// cambiar de idioma vuelve a montar el layout: sin esto cada cambio repetiría el GET
const synced = new Set<string>();

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

export async function flushPendingPreferences(userId: string) {
  const pending = readPendingPreferences(userId);
  if (Object.keys(pending).length > 0) await savePreferences(userId, pending);
}

export function runPreferenceSync(options: PreferenceSyncOptions) {
  const work = synced.has(options.userId) ? flushPendingPreferences(options.userId) : syncPreferences(options);
  return work.catch(reportPreferenceSyncError);
}

// error propio y no el de Axios, que lleva el contenido de la petición
function reportPreferenceSyncError(error: unknown) {
  const status = getApiErrorStatus(error);
  if (isNetworkError(error) || status === 401) return;
  const failure = new Error(`Preference sync failed (${status ?? "none"})`);
  failure.name = "PreferenceSyncError";
  reportClientError(failure);
}
