"use client";

import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { currencySymbol, type CurrencyCode } from "@/features/preference/lib/currency";
import { FeedbackRow } from "@/features/feedback/ui/feedback-row";
import { PlanRow } from "@/features/billing/ui/plan-row";
import { EmailImportRow } from "@/features/inbox/ui/email-import-row";
import { WhatsappRow } from "@/features/whatsapp/ui/whatsapp-row";
import { analyticsAvailable } from "@/lib/observability/client";
import { AnalyticsRow } from "./analytics-row";
import { AppearanceRow } from "./appearance-row";
import { ConnectionRow } from "./connection-row";
import { CurrencyRow } from "./currency-row";
import { DataExportRow } from "./data-export-row";
import { DeleteAccountRow } from "./delete-account-row";
import { LanguageRow } from "./language-row";
import { SettingsGroup } from "./settings-row";
import { SignOutRow } from "./sign-out-row";

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currency: CurrencyCode;
  transactionCount: number;
  onCurrencyChange: (currency: CurrencyCode) => void;
}

export function SettingsSheet({
  isOpen,
  onOpenChange,
  currency,
  transactionCount,
  onCurrencyChange,
}: SettingsSheetProps) {
  const t = useTranslations("settings");

  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} title={t("title")}>
      <ConnectionRow />

      <SettingsGroup>
        <PlanRow />
      </SettingsGroup>

      <SettingsGroup title={t("groups.preferences")}>
        <CurrencyRow currency={currency} onCurrencyChange={onCurrencyChange} />
        <LanguageRow />
        <AppearanceRow />
      </SettingsGroup>

      <SettingsGroup title={t("groups.integrations")}>
        <EmailImportRow />
        <WhatsappRow />
      </SettingsGroup>

      <SettingsGroup title={t("groups.data")}>
        <DataExportRow transactionCount={transactionCount} currencySymbol={currencySymbol(currency)} />
        {analyticsAvailable && <AnalyticsRow />}
      </SettingsGroup>

      <SettingsGroup>
        <FeedbackRow />
      </SettingsGroup>

      <SettingsGroup title={t("groups.account")}>
        <SignOutRow />
        <DeleteAccountRow transactionCount={transactionCount} />
      </SettingsGroup>
    </Sheet>
  );
}
