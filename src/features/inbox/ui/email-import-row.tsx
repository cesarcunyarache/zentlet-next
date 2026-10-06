"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
// import { useBillingSummary } from "@/features/billing/stores/billing.store";
import { UpgradePrompt } from "@/features/billing/ui/upgrade-button";
import { EmailConnectionPanel } from "./email-connection-panel";

export function EmailImportRow() {
  const t = useTranslations("inbox.connection");
  const tPaywall = useTranslations("billing.paywall");
  // const { canUse } = useBillingSummary();
  const [isExpanded, setIsExpanded] = useState(false);
  // TODO: gating Pro desactivado temporalmente para pruebas
  // const isAllowed = canUse("email_import");
  const isAllowed = true;

  return (
    <div className="border-app-border border-b">
      <div className="flex items-center justify-between gap-3.5 py-3.5">
        <span>
          <span className="text-app-fg block text-[14.5px] font-semibold">{t("label")}</span>
          <span className="text-app-muted mt-px block text-xs">{isAllowed ? t("hint") : tPaywall("email_import")}</span>
        </span>
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
      </div>
      {isAllowed && isExpanded ? <EmailConnectionPanel /> : null}
    </div>
  );
}
