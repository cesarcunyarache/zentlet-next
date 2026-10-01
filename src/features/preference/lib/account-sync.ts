import { getApiErrorStatus } from "@/core/services/api-error";
import { isNetworkError } from "@/core/offline/sync-policy";
import { reportClientError } from "@/lib/observability/client";
import type { Locale } from "@/i18n/routing";
import { preferenceService } from "../services/preference.service";
import { DEFAULT_CURRENCY } from "./currency";
import { getDeviceCurrency, setDeviceCurrency } from "./device-currency";
import { readPendingPreferences } from "./pending";
import { savePreferences } from "./save";
import { planPreferenceSync } from "./sync";

interface PreferenceSyncOptions {
  userId: string;
  currentLocale: () => Locale;
  switchLanguage: (language: Locale) => void;
  cancelled: () => boolean;
}

const UNAUTHORIZED_STATUS = 401;

const syncedUserIds = new Set<string>();

export async function syncPreferences({ userId, currentLocale, switchLanguage, cancelled }: PreferenceSyncOptions) {
  const pendingBefore = readPendingPreferences(userId);
  const currencyBefore = getDeviceCurrency(userId);
  const localeBefore = currentLocale();
  const server = await preferenceService.getPreferences();
  if (cancelled()) return;

  const locale = currentLocale();
  const currencyNow = getDeviceCurrency(userId);
  const pending = { ...pendingBefore, ...readPendingPreferences(userId) };
  if (currencyNow !== null && currencyNow !== currencyBefore) pending.currency = currencyNow;
  if (locale !== localeBefore) pending.language = locale;

  const device = {
    language: locale,
    currency: currencyNow ?? DEFAULT_CURRENCY,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  const { language, currency, update } = planPreferenceSync(server, device, pending);
  syncedUserIds.add(userId);
  setDeviceCurrency(userId, currency);
  if (language !== locale) switchLanguage(language);
  if (update) await savePreferences(userId, update);
}

async function flushPendingPreferences(userId: string) {
  const pending = readPendingPreferences(userId);
  if (Object.keys(pending).length > 0) await savePreferences(userId, pending);
}

export function runPreferenceSync(options: PreferenceSyncOptions) {
  const work = syncedUserIds.has(options.userId) ? flushPendingPreferences(options.userId) : syncPreferences(options);
  return work.catch(reportPreferenceSyncError);
}

function reportPreferenceSyncError(error: unknown) {
  const status = getApiErrorStatus(error);
  if (isNetworkError(error) || status === UNAUTHORIZED_STATUS) return;
  const failure = new Error(`Preference sync failed (${status ?? "none"})`);
  failure.name = "PreferenceSyncError";
  reportClientError(failure);
}
