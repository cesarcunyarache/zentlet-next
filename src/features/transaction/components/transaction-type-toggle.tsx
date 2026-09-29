"use client";

import { motion } from "motion/react";
import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import type { TransactionType } from "../types";

const TRANSACTION_TYPES = ["expense", "income"] as const satisfies readonly TransactionType[];

interface TransactionTypeToggleProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}

export function TransactionTypeToggle({ value, onChange }: TransactionTypeToggleProps) {
  const t = useTranslations("transactions");

  return (
    <span
      role="group"
      aria-label={t("form.typeGroup")}
      className="bg-app-fill inline-flex shrink-0 items-center rounded-full p-[3px]"
    >
      {TRANSACTION_TYPES.map((kind) => (
        <SignButton
          key={kind}
          type={kind}
          label={t(`type.${kind}`)}
          isActive={value === kind}
          onClick={() => onChange(kind)}
        />
      ))}
    </span>
  );
}

interface SignButtonProps {
  type: TransactionType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function SignButton({ type, label, isActive, onClick }: SignButtonProps) {
  const isExpense = type === "expense";

  return (
    <motion.button
      type="button"
      aria-pressed={isActive}
      aria-label={label}
      whileTap={{ scale: 0.9 }}
      transition={SPRING_PRESS}
      onClick={onClick}
      className={cn(
        "relative grid h-9 w-11 place-items-center rounded-full text-lg font-bold transition-colors",
        isActive ? "text-app-surface" : "text-app-muted hover:text-app-fg",
      )}
    >
      {isActive ? (
        <motion.span
          layoutId="tx-sign-pill"
          transition={SPRING_LAYOUT}
          className={cn(
            "absolute inset-0 rounded-full transition-colors duration-300",
            isExpense ? "bg-app-expense" : "bg-app-income",
          )}
        />
      ) : null}
      <span className="relative">{isExpense ? "−" : "+"}</span>
    </motion.button>
  );
}
