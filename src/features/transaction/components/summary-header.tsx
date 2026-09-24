"use client";

import { cn } from "@heroui/react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { AnimatedNumber } from "@/core/components/ui/animated-number";
import { PillSelect } from "@/core/components/ui/pill-select";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { formatNumber } from "../lib/format";
import type { Period, TransactionType } from "../types";

const PERIODS: Period[] = ["month", "previous", "all"];

interface SummaryHeaderProps {
  currency: string;
  /** Cifra grande, con signo ya aplicado. */
  headline: number;
  headlineLabel: string;
  tone: "neutral" | "expense" | "income";
  expenseTotal: number;
  incomeTotal: number;
  period: Period;
  kind: TransactionType | null;
  onPeriodChange: (period: Period) => void;
  onKindChange: (kind: TransactionType | null) => void;
}

export function SummaryHeader({
  currency,
  headline,
  headlineLabel,
  tone,
  expenseTotal,
  incomeTotal,
  period,
  kind,
  onPeriodChange,
  onKindChange,
}: SummaryHeaderProps) {
  const t = useTranslations("transactions.summary");

  return (
    <section>
      <p className="text-app-muted m-0 text-sm">{headlineLabel}</p>

      <h1
        className={cn(
          "font-display m-0 mt-1 flex items-baseline gap-1.5 leading-none font-bold tracking-[-0.045em] tabular-nums transition-colors duration-300",
          tone === "expense" && "text-app-expense",
          tone === "income" && "text-app-income",
          tone === "neutral" && "text-app-fg",
        )}
      >
        {headline < 0 && (
          <span className="text-app-muted text-[28px] font-semibold">−</span>
        )}
        <AnimatedNumber
          value={Math.abs(headline)}
          format={formatNumber}
          className="text-[clamp(52px,15vw,72px)]"
        />
        <span className="text-app-muted text-[22px] font-semibold tracking-normal">
          {currency}
        </span>
      </h1>

      <div
        role="group"
        aria-label={t("filterByType")}
        className="bg-app-fill mt-4 inline-flex items-center gap-0.5 rounded-full p-[3px]"
      >
        <KindChip
          kind="expense"
          active={kind === "expense"}
          onClick={() => onKindChange(kind === "expense" ? null : "expense")}
        >
          −<AnimatedNumber value={expenseTotal} format={formatNumber} />
        </KindChip>
        <KindChip
          kind="income"
          active={kind === "income"}
          onClick={() => onKindChange(kind === "income" ? null : "income")}
        >
          +<AnimatedNumber value={incomeTotal} format={formatNumber} />
        </KindChip>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <PillSelect
          label={t("period")}
          value={period}
          options={PERIODS.map((value) => ({ value, label: t(`periods.${value}`) }))}
          onChange={onPeriodChange}
          className="hover:bg-app-fill"
        />
      </div>
    </section>
  );
}

function KindChip({
  kind,
  active,
  onClick,
  children,
}: {
  kind: TransactionType;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      transition={SPRING_PRESS}
      className={cn(
        "relative min-h-[38px] rounded-full px-3.5 text-sm font-semibold tabular-nums transition-colors",
        active ? "text-app-surface" : "text-app-muted hover:text-app-fg bg-transparent",
      )}
    >
      {active && (
        <motion.span
          layoutId="summary-kind-pill"
          transition={SPRING_LAYOUT}
          className={cn(
            "absolute inset-0 rounded-full",
            kind === "expense" ? "bg-app-expense" : "bg-app-income",
          )}
        />
      )}
      <span className="relative">{children}</span>
    </motion.button>
  );
}
