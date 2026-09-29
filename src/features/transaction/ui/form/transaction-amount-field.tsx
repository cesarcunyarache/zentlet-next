"use client";

import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
import { displayAmount } from "@/lib/money";
import type { TransactionType } from "../../types";

const AMOUNT_MAX_LENGTH = 16;

interface TransactionAmountFieldProps {
  type: TransactionType;
  currency: string;
  rawAmount: string;
  onChange: (input: string) => void;
}

export function TransactionAmountField({ type, currency, rawAmount, onChange }: TransactionAmountFieldProps) {
  const t = useTranslations("transactions");

  return (
    <label
      className={cn(
        "font-display flex min-w-0 flex-1 items-baseline gap-1 text-[34px] font-bold tracking-[-0.035em] tabular-nums transition-colors duration-300",
        type === "expense" ? "text-app-expense" : "text-app-income",
      )}
    >
      <span className="text-[24px]">{currency}</span>
      <input
        value={displayAmount(rawAmount)}
        onChange={(event) => onChange(event.target.value)}
        type="text"
        inputMode="decimal"
        placeholder="0"
        maxLength={AMOUNT_MAX_LENGTH}
        autoComplete="off"
        aria-label={t("fields.amount")}
        className="placeholder:text-app-muted/40 min-w-0 flex-1 border-0 bg-transparent p-0 outline-none"
      />
    </label>
  );
}
