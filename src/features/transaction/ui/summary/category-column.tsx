"use client";

import { motion } from "motion/react";
import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
import { EASE_OUT_CSS, SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { useLongPress } from "../../hooks/useLongPress";
import { formatMoney, formatShort } from "../../lib/format";
import type { CategoryLike } from "../../types";
import type { CategoryTotal } from "../../types";
import { barLayout, isOverBudget as exceedsBudget } from "../../lib/category-strip";

const COLUMN_CLASS = "flex h-full w-[76px] shrink-0 flex-col justify-end sm:w-[88px]";
const COLUMN_STAGGER_MS = 50;
const DIMMED_OPACITY = 0.4;
const FALLBACK_ICON = "📦";

interface CategoryColumnProps {
  item: CategoryTotal;
  index: number;
  max: number;
  currency: string;
  selectedId: string | null;
  shouldReduceMotion: boolean;
  onSelect: (categoryId: string | null) => void;
  onLongPress: (category: CategoryLike) => void;
}

function useAmountLabel({ total, budget }: CategoryTotal, isIdle: boolean, currency: string) {
  const t = useTranslations("transactions.strip");
  const tBudget = useTranslations("budgets.strip");

  if (budget !== null) {
    return tBudget("spentOf", { spent: formatMoney(total, currency), budget: formatMoney(budget, currency) });
  }
  if (isIdle) return t("empty");
  return t(total > 0 ? "income" : "expenses", { amount: formatMoney(total, currency) });
}

export function CategoryColumn({
  item,
  index,
  max,
  currency,
  selectedId,
  shouldReduceMotion,
  onSelect,
  onLongPress,
}: CategoryColumnProps) {
  const tBudget = useTranslations("budgets.strip");
  const { category, total } = item;
  const { consumeClick, handlers } = useLongPress(() => onLongPress(category));
  const isSelected = selectedId === category.id;
  const isOverBudget = exceedsBudget(item);
  const { isIdle, height, fill, track } = barLayout(item, max);
  const hasTrack = track !== null;
  const amountLabel = useAmountLabel(item, isIdle, currency);

  const delay = `${shouldReduceMotion ? 0 : index * COLUMN_STAGGER_MS}ms`;
  const growth = { transitionDelay: delay, transitionTimingFunction: EASE_OUT_CSS };

  function handleClick() {
    if (!consumeClick()) onSelect(isSelected ? null : category.id);
  }

  return (
    <motion.button
      layout={!shouldReduceMotion}
      type="button"
      aria-pressed={isSelected}
      aria-label={`${category.name}, ${amountLabel}`}
      aria-description={tBudget("hint")}
      title={`${category.name} · ${amountLabel}`}
      onClick={handleClick}
      {...handlers}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: selectedId && !isSelected ? DIMMED_OPACITY : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85 }}
      whileTap={{ scale: 0.94 }}
      transition={SPRING_LAYOUT}
      className={cn("group select-none [-webkit-touch-callout:none]", COLUMN_CLASS)}
    >
      <span
        style={
          {
            "--bar-height": `${height}px`,
            "--fill-height": `${fill}px`,
            "--track-height": `${track ?? 0}px`,
            ...growth,
          } as React.CSSProperties
        }
        className={cn(
          "relative flex h-(--bar-height) w-full items-center justify-end overflow-hidden rounded-3xl transition-[height] duration-600 motion-reduce:transition-none starting:h-11",
          isIdle ? "flex-row justify-center gap-1" : "flex-col gap-1.5 pb-3.5",
          hasTrack && "bg-app-fill",
          isSelected && category.color ? "text-app-on-pastel" : "text-app-fg",
        )}
      >
        <span
          aria-hidden
          style={{
            transitionDelay: `0ms, ${delay}`,
            transitionTimingFunction: `ease, ${EASE_OUT_CSS}`,
            ...(isSelected && { backgroundColor: category.color || "var(--app-fill-strong)" }),
          }}
          className={cn(
            "absolute inset-x-0 bottom-0 h-(--fill-height) transition-[background-color,height] duration-[300ms,600ms] motion-reduce:transition-none starting:h-0",
            !isSelected &&
              (isOverBudget
                ? "bg-app-expense-soft"
                : "bg-app-fill-strong group-hover:bg-[color-mix(in_oklch,var(--app-fg)_16%,transparent)]"),
          )}
        />
        {hasTrack ? <BudgetMarker isOverBudget={isOverBudget} growth={growth} /> : null}
        <motion.span
          aria-hidden
          className={cn("relative leading-none", isIdle ? "text-base" : "text-2xl")}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.2, rotate: -8 }}
          transition={SPRING_PRESS}
        >
          {category.icon || FALLBACK_ICON}
        </motion.span>
        <span className="num relative text-[13px] leading-none font-semibold">{formatShort(total)}</span>
      </span>
    </motion.button>
  );
}

interface BudgetMarkerProps {
  isOverBudget: boolean;
  growth: React.CSSProperties;
}

function BudgetMarker({ isOverBudget, growth }: BudgetMarkerProps) {
  if (isOverBudget) {
    return (
      <span
        aria-hidden
        style={growth}
        className="border-app-expense/60 pointer-events-none absolute inset-x-0 bottom-(--track-height) border-t-2 border-dashed transition-[bottom] duration-600 motion-reduce:transition-none"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="border-app-fg/25 pointer-events-none absolute inset-0 rounded-3xl border-[1.5px] border-dashed"
    />
  );
}
