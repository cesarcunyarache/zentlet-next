"use client";

import { useEffect, useEffectEvent } from "react";
import { useLocale } from "next-intl";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { runPreferenceSync } from "../lib/account-sync";

export function PreferenceSync() {
  const { userId } = useOfflineSession();
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

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
