"use client";

import { useEffect, useEffectEvent } from "react";
import { useLocale } from "next-intl";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { runPreferenceSync } from "../lib/account-sync";

/**
 * Alinea las preferencias de la cuenta con el dispositivo al abrir la app
 * y reenvía lo pendiente al volver la conexión o la pestaña.
 */
export function PreferenceSync() {
  const { userId } = useOfflineSession();
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  // el idioma y la ruta de ese momento, sin repetir la sincronización en cada navegación
  const currentLocale = useEffectEvent(() => locale);
  const switchLanguage = useEffectEvent((language: Locale) => router.replace(pathname, { locale: language }));

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      void runPreferenceSync({ userId, currentLocale, switchLanguage, cancelled: () => cancelled });
    };
    const onVisible = () => document.visibilityState === "visible" && run();

    run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  return null;
}
