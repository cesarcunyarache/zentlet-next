"use client";

import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { currencySymbol, type CurrencyCode } from "@/features/preference/lib/currency";
import { FeedbackRow } from "@/features/feedback/components/feedback-row";
import { analyticsAvailable } from "@/lib/observability/client";
import { AnalyticsRow } from "./analytics-row";
import { AppearanceRow } from "./appearance-row";
import { ConnectionRow } from "./connection-row";
import { CurrencyRow } from "./currency-row";
import { DataExportRow } from "./data-export-row";
import { DeleteAccountRow } from "./delete-account-row";
import { LanguageRow } from "./language-row";
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
      <CurrencyRow currency={currency} onCurrencyChange={onCurrencyChange} />
      <LanguageRow />
      <AppearanceRow />
      <DataExportRow transactionCount={transactionCount} currencySymbol={currencySymbol(currency)} />
      {analyticsAvailable && <AnalyticsRow />}
      <FeedbackRow />
      <SignOutRow />
      <DeleteAccountRow transactionCount={transactionCount} />
    </Sheet>
  );
}
