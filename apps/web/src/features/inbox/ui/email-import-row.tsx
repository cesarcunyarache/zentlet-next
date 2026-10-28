"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
import { SettingsRow } from "@/features/account/ui/settings-row";
import { UpgradePrompt } from "@/features/billing/ui/upgrade-button";
import { EmailConnectionPanel } from "./email-connection-panel";

export function EmailImportRow() {
  const t = useTranslations("inbox.connection");
  const tPaywall = useTranslations("billing.paywall");
  const [isExpanded, setIsExpanded] = useState(false);
  const isAllowed = true;

  return (
    <div>
      <SettingsRow label={t("label")} hint={isAllowed ? t("hint") : tPaywall("email_import")}>
        {isAllowed ? (
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((value) => !value)}
            className="bg-app-fill hover:bg-app-fill-strong text-app-fg inline-flex min-h-[30px] shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold"
          >
            {t(isExpanded ? "hide" : "configure")}
            <ChevronDown className={cn("size-3.5 transition-transform", isExpanded && "rotate-180")} aria-hidden />
          </button>
        ) : (
          <UpgradePrompt />
        )}
      </SettingsRow>
      {isAllowed && isExpanded ? <EmailConnectionPanel /> : null}
    </div>
  );
}
