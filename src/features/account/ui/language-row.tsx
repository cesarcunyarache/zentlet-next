"use client";

import { useLocale, useTranslations } from "next-intl";
import { PillSelect } from "@/core/components/ui/pill-select";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { savePreferences } from "@/features/preference/lib/save";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing, type Locale } from "@/i18n/routing";
import { SettingsRow } from "./settings-row";

const LANGUAGES = routing.locales.map((locale) => ({ value: locale, label: localeNames[locale] }));

export function LanguageRow() {
  const t = useTranslations();
  const { userId } = useOfflineSession();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function changeLanguage(next: Locale) {
    savePreferences(userId, { language: next }).catch(() => {});
    router.replace(pathname, { locale: next });
  }

  return (
    <SettingsRow label={t("common.language")} hint={t("settings.language.hint")}>
      <PillSelect
        label={t("common.language")}
        value={locale}
        options={LANGUAGES}
        onChange={changeLanguage}
        className="bg-app-fill"
      />
    </SettingsRow>
  );
}
