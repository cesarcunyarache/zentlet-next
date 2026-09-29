"use client";

import { useTranslations } from "next-intl";
import { PillSelect } from "@/core/components/ui/pill-select";
import { CURRENCIES, currencySymbol, type CurrencyCode } from "@/features/preference/lib/currency";
import { SettingsRow } from "./settings-row";

interface CurrencyRowProps {
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
}

export function CurrencyRow({ currency, onCurrencyChange }: CurrencyRowProps) {
  const t = useTranslations("settings.currency");
  const options = CURRENCIES.map(({ code, key }) => ({ value: code, label: t(`options.${key}`) }));

  return (
    <SettingsRow label={t("label")} hint={t("hint")}>
      <PillSelect
        label={t("label")}
        value={currency}
        options={options}
        onChange={onCurrencyChange}
        display={currencySymbol(currency)}
        className="bg-app-fill"
      />
    </SettingsRow>
  );
}
