"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
import { EASE_OUT_CSS, SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { useLongPress } from "../hooks/useLongPress";
import { formatMoney, formatShort } from "../lib/format";
import { CHART_HEIGHT, barHeight, budgetBarHeights } from "../lib/chart";
import type { CategoryLike } from "../types";
/** Barras fantasma cuando aún no hay movimientos, descendentes como un gráfico real. */
const GHOST_RATIO = [1, 0.78, 0.6, 0.34];

export interface CategoryTotal {
  category: CategoryLike;
  /** Con signo: negativo = gasto, positivo = ingreso. */
  total: number;
  /** Tope del periodo; con él, `total` es lo gastado. */
  budget: number | null;
}

interface CategoryStripProps {
  /** Todas las categorías, de mayor a menor importe absoluto (0 incluido). */
  data: CategoryTotal[];
  currency: string;
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
  onLongPress: (category: CategoryLike) => void;
}

const COLUMN = "flex h-full w-[76px] shrink-0 flex-col justify-end sm:w-[88px]";

/**
 * Importe por categoría: columnas altas, emoji y cifra; se desliza en
 * horizontal. Mantener pulsada una columna abre su presupuesto.
 */
export function CategoryStrip({
  data,
  currency,
  selectedId,
  onSelect,
  onLongPress,
}: CategoryStripProps) {
  const t = useTranslations("transactions.strip");
  const reduceMotion = useReducedMotion();
  // el tope entra en la escala: su contorno nunca se sale del gráfico
  const max = Math.max(0, ...data.map(({ total, budget }) => Math.max(Math.abs(total), budget ?? 0)));

  if (max === 0) {
    return (
      <div
        aria-hidden
        className="flex items-end gap-2.5"
        style={{ height: CHART_HEIGHT }}
      >
        {GHOST_RATIO.map((ratio, index) => (
          <motion.span
            key={index}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: `${ratio * 100}%`, opacity: 1 }}
            transition={{
              ...SPRING_LAYOUT,
              delay: reduceMotion ? 0 : index * 0.06,
            }}
            className="bg-app-fill flex-1 rounded-3xl"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="scroll-clean -mx-5 flex items-end gap-2.5 overflow-x-auto px-5 sm:-mx-6 sm:px-6"
      style={{ height: CHART_HEIGHT }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {data.map((item, index) => (
          <CategoryColumn
            key={item.category.id}
            item={item}
            index={index}
            max={max}
            currency={currency}
            selectedId={selectedId}
            reduceMotion={Boolean(reduceMotion)}
            onSelect={onSelect}
            onLongPress={onLongPress}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface CategoryColumnProps {
  item: CategoryTotal;
  index: number;
  max: number;
  currency: string;
  selectedId: string | null;
  reduceMotion: boolean;
  onSelect: (categoryId: string | null) => void;
  onLongPress: (category: CategoryLike) => void;
}

function barLayout({ total, budget }: CategoryTotal, max: number) {
  if (budget === null) {
    const { idle, height } = barHeight(total, max);
    return { idle, height, fill: height, track: null };
  }
  const { track, fill } = budgetBarHeights(Math.abs(total), budget, max);
  return { idle: false, height: Math.max(track, fill), fill, track };
}

function CategoryColumn({
  item,
  index,
  max,
  currency,
  selectedId,
  reduceMotion,
  onSelect,
  onLongPress,
}: CategoryColumnProps) {
  const t = useTranslations("transactions.strip");
  const tBudget = useTranslations("budgets.strip");
  const { category, total, budget } = item;
  const { consumeClick, handlers } = useLongPress(() => onLongPress(category));
  const isSelected = selectedId === category.id;
  const isOverBudget = budget !== null && Math.abs(total) > budget;
  const { idle, height, fill, track } = barLayout(item, max);

  const amountLabel =
    budget !== null
      ? tBudget("spentOf", { spent: formatMoney(total, currency), budget: formatMoney(budget, currency) })
      : idle
        ? t("empty")
        : t(total > 0 ? "income" : "expenses", { amount: formatMoney(total, currency) });

  const delay = `${reduceMotion ? 0 : index * 50}ms`;
  const growth = { transitionDelay: delay, transitionTimingFunction: EASE_OUT_CSS };

  return (
    <motion.button
      layout={!reduceMotion}
      type="button"
      aria-pressed={isSelected}
      aria-label={`${category.name}, ${amountLabel}`}
      aria-description={tBudget("hint")}
      title={`${category.name} · ${amountLabel}`}
      onClick={() => {
        if (!consumeClick()) onSelect(isSelected ? null : category.id);
      }}
      {...handlers}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: selectedId && !isSelected ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85 }}
      whileTap={{ scale: 0.94 }}
      transition={SPRING_LAYOUT}
      className={cn("group select-none [-webkit-touch-callout:none]", COLUMN)}
    >
      {/*
        Las alturas van por CSS y no por `animate`: al reordenarse las
        columnas (`layout`), Motion podía dejar la barra en su altura
        anterior. Una transición CSS siempre termina en el valor final.
      */}
      <span
        style={{
          "--bar-height": `${height}px`,
          "--fill-height": `${fill}px`,
          "--track-height": `${track ?? 0}px`,
          ...growth,
        } as React.CSSProperties}
        className={cn(
          "relative flex h-(--bar-height) w-full items-center justify-end overflow-hidden rounded-3xl transition-[height] duration-600 motion-reduce:transition-none starting:h-11",
          idle ? "flex-row justify-center gap-1" : "flex-col gap-1.5 pb-3.5",
          track !== null && "bg-app-fill",
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
        {track !== null &&
          (isOverBudget ? (
            <span
              aria-hidden
              style={growth}
              className="border-app-expense/60 pointer-events-none absolute inset-x-0 bottom-(--track-height) border-t-2 border-dashed transition-[bottom] duration-600 motion-reduce:transition-none"
            />
          ) : (
            <span
              aria-hidden
              className="border-app-fg/25 pointer-events-none absolute inset-0 rounded-3xl border-[1.5px] border-dashed"
            />
          ))}
        <motion.span
          aria-hidden
          className={cn("relative leading-none", idle ? "text-base" : "text-2xl")}
          whileHover={reduceMotion ? undefined : { scale: 1.2, rotate: -8 }}
          transition={SPRING_PRESS}
        >
          {category.icon || "📦"}
        </motion.span>
        <span className="num relative text-[13px] leading-none font-semibold">
          {formatShort(total)}
        </span>
      </span>
    </motion.button>
  );
}
