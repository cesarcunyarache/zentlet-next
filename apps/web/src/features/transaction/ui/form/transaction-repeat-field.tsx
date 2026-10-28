"use client";

import { Repeat } from "lucide-react";
import { useTranslations } from "next-intl";
import { PillSelect } from "@/core/components/ui/pill-select";
import { RECURRENCE_FREQUENCIES, type RecurrenceFrequency } from "@/features/recurring/types";

const ONCE = "ONCE";
const REPEAT_OPTIONS = [ONCE, ...RECURRENCE_FREQUENCIES] as const;

type RepeatOption = (typeof REPEAT_OPTIONS)[number];

interface TransactionRepeatFieldProps {
  value: RecurrenceFrequency | null;
  onChange: (value: RecurrenceFrequency | null) => void;
}

export function TransactionRepeatField({ value, onChange }: TransactionRepeatFieldProps) {
  const t = useTranslations("transactions.repeat");
  const selected: RepeatOption = value ?? ONCE;

  return (
    <PillSelect
      label={t("label")}
      value={selected}
      options={REPEAT_OPTIONS.map((option) => ({ value: option, label: t(`options.${option}`) }))}
      onChange={(next) => onChange(next === ONCE ? null : next)}
      display={
        <span className="inline-flex items-center gap-1.5">
          {value ? <Repeat className="size-3.5" aria-hidden /> : null}
          {t(`options.${selected}`)}
        </span>
      }
      className="bg-app-fill min-h-9 px-3"
    />
  );
}
