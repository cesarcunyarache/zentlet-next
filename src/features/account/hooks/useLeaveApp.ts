"use client";

import { useLocale } from "next-intl";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { resetUser } from "@/lib/observability/client";
import { getPathname } from "@/i18n/navigation";

type Href = Parameters<typeof getPathname>[0]["href"];

export function useLeaveApp() {
  const locale = useLocale();
  const { clearLocalData } = useOfflineSession();

  return async function leaveApp(href: Href) {
    resetUser();
    await clearLocalData();
    window.location.replace(getPathname({ href, locale }));
  };
}
