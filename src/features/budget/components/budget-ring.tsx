"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@heroui/react";
import { useLocale, useTranslations } from "next-intl";
import { formatMoney } from "@/features/transaction/lib/format";
import { SPRING_LAYOUT } from "@/lib/ease";
import { budgetPreview, daysLeft, periodRangeLabel } from "../lib/progress";
import type { PeriodRange } from "../types";

interface BudgetRingProps {
  spent: number;
  amount: number;
  range: PeriodRange;
  today: string;
  currency: string;
}

const SIZE = 40;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;

/** Anillo de lo gastado frente al tope; el detalle aparece al pasar el cursor o al tocarlo. */
export function BudgetRing({ spent, amount, range, today, currency }: BudgetRingProps) {
  const t = useTranslations("budgets.sheet");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const tooltipId = useId();
  const wrapper = useRef<HTMLSpanElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const preview = budgetPreview(spent, amount);
  const isOver = Boolean(preview?.excess);
  const percent = amount > 0 ? Math.round((spent / amount) * 100) : 0;

  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setIsOpen(false);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const onMouse = (open: boolean) => (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") setIsOpen(open);
  };

  return (
    <span ref={wrapper} className="relative shrink-0" onPointerEnter={onMouse(true)} onPointerLeave={onMouse(false)}>
      <button
        type="button"
        aria-label={t("progress", { percent })}
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        onFocus={(event) => event.currentTarget.matches(":focus-visible") && setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="block rounded-full"
        style={{ width: SIZE, height: SIZE }}
      >
        <svg aria-hidden width={SIZE} height={SIZE} className="-rotate-90">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-app-fill" />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            className={cn("transition-colors", isOver ? "stroke-app-expense" : "stroke-app-fg")}
            initial={false}
            animate={{ pathLength: preview?.ratio ?? 0, opacity: preview && spent > 0 ? 1 : 0 }}
            transition={reduceMotion ? { duration: 0 } : SPRING_LAYOUT}
          />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.span
            id={tooltipId}
            role="tooltip"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="bg-app-fg text-app-surface absolute right-0 bottom-full z-10 mb-2.5 flex w-max min-w-48 origin-bottom-right flex-col gap-2 rounded-2xl px-3.5 py-3 text-[13px] shadow-[var(--shadow-sheet)]"
          >
            <span className="opacity-70">
              {periodRangeLabel(range, locale)} · {t("daysLeft", { count: daysLeft(range, today) })}
            </span>
            <TooltipRow label={t("spentLabel")} value={formatMoney(spent, currency)} />
            {preview && (
              <TooltipRow
                label={t(isOver ? "excessLabel" : "remainingLabel")}
                value={formatMoney(isOver ? preview.excess : preview.remaining, currency)}
                highlight={isOver}
              />
            )}
            <span
              aria-hidden
              className="bg-app-fg absolute -bottom-1 right-4 size-2.5 rotate-45 rounded-[2px]"
            />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function TooltipRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <span className="flex items-baseline justify-between gap-6">
      <span className="opacity-70">{label}</span>
      <span className={cn("num font-semibold tabular-nums", highlight && "text-app-expense-soft")}>{value}</span>
    </span>
  );
}
