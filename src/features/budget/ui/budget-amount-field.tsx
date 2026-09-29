"use client";

import { useTranslations } from "next-intl";
import { displayAmount } from "@/lib/money";

interface BudgetAmountFieldProps {
  currency: string;
  rawAmount: string;
  onChange: (input: string) => void;
}

const MAX_AMOUNT_LENGTH = 16;

export function BudgetAmountField({ currency, rawAmount, onChange }: BudgetAmountFieldProps) {
  const t = useTranslations("budgets.sheet");

  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-app-muted text-[13px] font-semibold">{t("heading")}</span>
      <span className="font-display text-app-fg flex items-baseline gap-1 text-[34px] font-bold tracking-[-0.035em] tabular-nums">
        <span className="text-[24px]">{currency}</span>
        <input
          value={displayAmount(rawAmount)}
          onChange={(event) => onChange(event.target.value)}
          type="text"
          inputMode="decimal"
          placeholder="0"
          maxLength={MAX_AMOUNT_LENGTH}
          autoComplete="off"
          autoFocus
          className="placeholder:text-app-muted/40 min-w-0 flex-1 border-0 bg-transparent p-0 outline-none"
        />
      </span>
    </label>
  );
}
