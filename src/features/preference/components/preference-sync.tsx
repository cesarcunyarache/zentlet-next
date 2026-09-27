"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { accountService } from "@/features/account/services/account.service";
import type { Locale } from "@/i18n/routing";
import { getDeviceCurrency, setDeviceCurrency } from "../hooks/useCurrency";
import { readPendingPreferences } from "../lib/pending";
import { savePreferences } from "../lib/save";
import { planPreferenceSync } from "../lib/sync";

/** Alinea las preferencias de la cuenta con el dispositivo al abrir la app. No pinta nada. */
export function PreferenceSync() {
  const { userId } = useOfflineSession();
  const locale = useLocale() as Locale;

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const server = await accountService.getPreferences();
      if (cancelled) return;
      const device = {
        language: locale,
        currency: getDeviceCurrency(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      const { currency, update } = planPreferenceSync(server, device, readPendingPreferences(userId));
      setDeviceCurrency(currency);
      if (update) await savePreferences(userId, update);
    }

    sync().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, locale]);

  return null;
}
