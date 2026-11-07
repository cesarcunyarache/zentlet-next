"use client";

import { cn } from "@heroui/react";
import { motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { AnimatedNumber } from "@/core/components/ui/animated-number";
import { PillSelect } from "@/core/components/ui/pill-select";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { formatNumber } from "@/lib/money";
import type { Period, TransactionType } from "../../types";

const PERIODS: Period[] = ["month", "previous", "all"];
const HIDDEN_AMOUNT = "••••";

type SummaryTone = "neutral" | "expense" | "income";

const TONE_CLASS: Record<SummaryTone, string> = {
  expense: "text-app-expense",
  income: "text-app-income",
  neutral: "text-app-fg",
};

interface SummaryHeaderProps {
  currency: string;
  headline: number;
  headlineLabel: string;
  tone: SummaryTone;
  expenseTotal: number;
  incomeTotal: number;
  period: Period;
  kind: TransactionType | null;
  isHidden: boolean;
  onToggleHidden: () => void;
  onPeriodChange: (period: Period) => void;
  onKindChange: (kind: TransactionType | null) => void;
  children?: React.ReactNode;
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
  isHidden,
  onToggleHidden,
  onPeriodChange,
  onKindChange,
  children,
}: SummaryHeaderProps) {
  const t = useTranslations("transactions.summary");

  function toggleKind(next: TransactionType) {
    onKindChange(kind === next ? null : next);
  }

  return (
    <section>
      <div className="flex items-center gap-1">
        <p className="text-app-muted m-0 text-sm">{headlineLabel}</p>
        <button
          type="button"
          aria-label={t(isHidden ? "showBalance" : "hideBalance")}
          aria-pressed={isHidden}
          onClick={onToggleHidden}
          className="text-app-muted hover:text-app-fg grid size-8 place-items-center rounded-full transition-colors"
        >
          {isHidden ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
        </button>
      </div>

      <h1
        className={cn(
          "font-display m-0 mt-1 flex items-baseline gap-1.5 leading-none font-bold tracking-[-0.045em] tabular-nums transition-colors duration-300",
          TONE_CLASS[tone],
        )}
      >
        {!isHidden && headline < 0 ? <span className="text-app-muted text-[28px] font-semibold">−</span> : null}
        {isHidden ? (
          <span className="text-[clamp(52px,15vw,72px)]">{HIDDEN_AMOUNT}</span>
        ) : (
          <AnimatedNumber value={Math.abs(headline)} format={formatNumber} className="text-[clamp(52px,15vw,72px)]" />
        )}
        <span className="text-app-muted text-[22px] font-semibold tracking-normal">{currency}</span>
      </h1>

      <div
        role="group"
        aria-label={t("filterByType")}
        className="bg-app-fill mt-4 inline-flex items-center gap-0.5 rounded-full p-[3px]"
      >
        <KindChip kind="expense" isActive={kind === "expense"} onClick={() => toggleKind("expense")}>
          −{isHidden ? HIDDEN_AMOUNT : <AnimatedNumber value={expenseTotal} format={formatNumber} />}
        </KindChip>
        <KindChip kind="income" isActive={kind === "income"} onClick={() => toggleKind("income")}>
          +{isHidden ? HIDDEN_AMOUNT : <AnimatedNumber value={incomeTotal} format={formatNumber} />}
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
        {children}
      </div>
    </section>
  );
}

interface KindChipProps {
  kind: TransactionType;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function KindChip({ kind, isActive, onClick, children }: KindChipProps) {
  return (
    <motion.button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      transition={SPRING_PRESS}
      className={cn(
        "relative min-h-[38px] rounded-full px-3.5 text-sm font-semibold tabular-nums transition-colors",
        isActive ? "text-app-surface" : "text-app-muted hover:text-app-fg bg-transparent",
      )}
    >
      {isActive ? (
        <motion.span
          layoutId="summary-kind-pill"
          transition={SPRING_LAYOUT}
          className={cn("absolute inset-0 rounded-full", kind === "expense" ? "bg-app-expense" : "bg-app-income")}
        />
      ) : null}
      <span className="relative">{children}</span>
    </motion.button>
  );
}
