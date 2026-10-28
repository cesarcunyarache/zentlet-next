"use client";

import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useAnalyticsConsent } from "@/features/legal/hooks/useAnalyticsConsent";
import { SettingsRow } from "./settings-row";

export function AnalyticsRow() {
  const t = useTranslations("settings.analytics");
  const { consent, choose } = useAnalyticsConsent();
  const isEnabled = consent === "granted";

  function toggle() {
    choose(isEnabled ? "denied" : "granted", "settings");
  }

  return (
    <SettingsRow label={t("label")} hint={t(isEnabled ? "on" : "off")}>
      <button
        type="button"
        role="switch"
        aria-checked={isEnabled}
        aria-label={t("label")}
        onClick={toggle}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          isEnabled ? "bg-app-income" : "bg-app-fill-strong",
        )}
      >
        <span
          className={cn(
            "bg-app-surface absolute top-0.5 left-0.5 size-6 rounded-full shadow transition-transform",
            isEnabled && "translate-x-5",
          )}
        />
      </button>
    </SettingsRow>
  );
}
