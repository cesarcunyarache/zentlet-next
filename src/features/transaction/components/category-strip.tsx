"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
import { EASE_OUT_CSS, SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { formatMoney, formatShort } from "../lib/format";
import { CHART_HEIGHT, barHeight } from "../lib/chart";
import type { CategoryLike } from "../types";
/** Barras fantasma cuando aún no hay movimientos, descendentes como un gráfico real. */
const GHOST_RATIO = [1, 0.78, 0.6, 0.34];

export interface CategoryTotal {
  category: CategoryLike;
  /** Con signo: negativo = gasto, positivo = ingreso. */
  total: number;
}

interface CategoryStripProps {
  /** Todas las categorías, de mayor a menor importe absoluto (0 incluido). */
  data: CategoryTotal[];
  currency: string;
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
}

const COLUMN = "flex h-full w-[76px] shrink-0 flex-col justify-end sm:w-[88px]";

/**
 * Importe por categoría: columnas altas, emoji y cifra; se desliza en
 * horizontal.
 */
export function CategoryStrip({
  data,
  currency,
  selectedId,
  onSelect,
}: CategoryStripProps) {
  const t = useTranslations("transactions.strip");
  const reduceMotion = useReducedMotion();
  const max = Math.max(0, ...data.map((d) => Math.abs(d.total)));

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
        {data.map(({ category, total }, index) => {
          const isSelected = selectedId === category.id;
          const { idle, height } = barHeight(total, max);
          const amountLabel = idle
            ? t("empty")
            : t(total > 0 ? "income" : "expenses", { amount: formatMoney(total, currency) });

          return (
            <motion.button
              key={category.id}
              layout={!reduceMotion}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${category.name}, ${amountLabel}`}
              title={`${category.name} · ${amountLabel}`}
              onClick={() => onSelect(isSelected ? null : category.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: selectedId && !isSelected ? 0.4 : 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              whileTap={{ scale: 0.94 }}
              transition={SPRING_LAYOUT}
              className={cn("group", COLUMN)}
            >
              {/*
                La altura va por CSS y no por `animate`: al reordenarse las
                columnas (`layout`), Motion podía dejar la barra en su altura
                anterior. Una transición CSS siempre termina en el valor final.
              */}
              <span
                style={{
                  "--bar-height": `${height}px`,
                  transitionDelay: `0ms, ${reduceMotion ? 0 : index * 50}ms`,
                  transitionTimingFunction: `ease, ${EASE_OUT_CSS}`,
                  ...(isSelected && {
                    backgroundColor: category.color || "var(--app-fill-strong)",
                  }),
                } as React.CSSProperties}
                className={cn(
                  "flex h-(--bar-height) w-full items-center justify-end rounded-3xl transition-[background-color,height] duration-[300ms,600ms] motion-reduce:transition-none starting:h-11",
                  idle
                    ? "flex-row justify-center gap-1"
                    : "flex-col gap-1.5 pb-3.5",
                  !isSelected &&
                    "bg-app-fill-strong group-hover:bg-[color-mix(in_oklch,var(--app-fg)_16%,transparent)]",
                  isSelected && category.color ? "text-app-on-pastel" : "text-app-fg",
                )}
              >
                <motion.span
                  aria-hidden
                  className={cn(
                    "leading-none",
                    idle ? "text-base" : "text-2xl",
                  )}
                  whileHover={
                    reduceMotion ? undefined : { scale: 1.2, rotate: -8 }
                  }
                  transition={SPRING_PRESS}
                >
                  {category.icon || "📦"}
                </motion.span>
                <span className="num text-[13px] leading-none font-semibold">
                  {formatShort(total)}
                </span>
              </span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
