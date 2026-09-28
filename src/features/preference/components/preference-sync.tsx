"use client";

import { useEffect, useEffectEvent } from "react";
import { useLocale } from "next-intl";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { accountService } from "@/features/account/services/account.service";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getDeviceCurrency, setDeviceCurrency } from "../hooks/useCurrency";
import { readPendingPreferences } from "../lib/pending";
import { savePreferences } from "../lib/save";
import { planPreferenceSync } from "../lib/sync";

/**
 * Alinea las preferencias de la cuenta con el dispositivo al abrir la app:
 * si la URL llegó en otro idioma (p. ej. el del navegador tras iniciar
 * sesión), la cambia al de la cuenta. No pinta nada.
 */
export function PreferenceSync() {
  const { userId } = useOfflineSession();
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  // la ruta de ese momento, sin repetir la sincronización en cada navegación
  const switchLanguage = useEffectEvent((language: Locale) => router.replace(pathname, { locale: language }));

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      // un cambio recién confirmado ya no está pendiente, pero la
      // respuesta del servidor pudo salir antes: lo leído al empezar también cuenta
      const pendingBefore = readPendingPreferences(userId);
      const currencyBefore = getDeviceCurrency(userId);
      const server = await accountService.getPreferences();
      if (cancelled) return;
      const device = {
        language: locale,
        currency: getDeviceCurrency(userId),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      const pending = { ...pendingBefore, ...readPendingPreferences(userId) };
      // la moneda elegida mientras se esperaba al servidor manda sobre su respuesta
      if (device.currency !== currencyBefore) pending.currency = device.currency;
      const { language, currency, update } = planPreferenceSync(server, device, pending);
      setDeviceCurrency(userId, currency);
      if (language !== locale) switchLanguage(language);
      if (update) await savePreferences(userId, update);
    }

    sync().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, locale]);

  return null;
}
