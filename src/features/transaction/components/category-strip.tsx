"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@heroui/react";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { formatMoney, formatShort } from "../lib/format";
import type { CategoryLike } from "../types";

/** Alto total del gráfico y zócalo mínimo de una barra con gasto. */
const CHART_HEIGHT = 232;
const BAR_BASE = 76;
/** Categoría sin gasto: una píldora baja con "emoji 0". */
const IDLE_HEIGHT = 44;
/** Con pocas categorías el resto de columnas queda reservado. */
const MIN_COLUMNS = 4;
/** Barras fantasma cuando aún no hay gastos, descendentes como un gráfico real. */
const GHOST_RATIO = [1, 0.78, 0.6, 0.34];

export interface CategoryTotal {
  category: CategoryLike;
  total: number;
}

interface CategoryStripProps {
  /** Todas las categorías, ordenadas de mayor a menor gasto (0 incluido). */
  data: CategoryTotal[];
  currency: string;
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
}

const COLUMN = "flex h-full w-[76px] shrink-0 flex-col justify-end sm:w-[88px]";

/** Gasto por categoría: columnas altas, emoji y cifra; se desliza en horizontal. */
export function CategoryStrip({ data, currency, selectedId, onSelect }: CategoryStripProps) {
  const reduceMotion = useReducedMotion();
  const max = Math.max(0, ...data.map((d) => d.total));

  if (max === 0) {
    return (
      <div aria-hidden className="flex items-end gap-2.5" style={{ height: CHART_HEIGHT }}>
        {GHOST_RATIO.map((ratio, index) => (
          <motion.span
            key={index}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: `${ratio * 100}%`, opacity: 1 }}
            transition={{ ...SPRING_LAYOUT, delay: reduceMotion ? 0 : index * 0.06 }}
            className="bg-app-fill flex-1 rounded-3xl"
          />
        ))}
      </div>
    );
  }

  const reserved = Math.max(0, MIN_COLUMNS - data.length);

  return (
    <div
      role="group"
      aria-label="Gastos por categoría"
      className="scroll-clean -mx-5 flex items-end gap-2.5 overflow-x-auto px-5 sm:-mx-6 sm:px-6"
      style={{ height: CHART_HEIGHT }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {data.map(({ category, total }, index) => {
          const isSelected = selectedId === category.id;
          const idle = total === 0;
          const height = idle
            ? IDLE_HEIGHT
            : BAR_BASE + Math.round((total / max) * (CHART_HEIGHT - BAR_BASE));

          return (
            <motion.button
              key={category.id}
              layout={!reduceMotion}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${category.name}, ${formatMoney(total, currency)}`}
              title={`${category.name} · ${formatMoney(total, currency)}`}
              onClick={() => onSelect(isSelected ? null : category.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: selectedId && !isSelected ? 0.4 : 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              whileTap={{ scale: 0.94 }}
              transition={SPRING_LAYOUT}
              className={cn("group", COLUMN)}
            >
              <motion.span
                initial={reduceMotion ? false : { height: IDLE_HEIGHT }}
                animate={{ height }}
                style={
                  isSelected
                    ? { backgroundColor: category.color || "var(--app-fill-strong)" }
                    : undefined
                }
                transition={{ ...SPRING_LAYOUT, delay: reduceMotion ? 0 : index * 0.05 }}
                className={cn(
                  "flex w-full items-center justify-end rounded-3xl transition-colors duration-300",
                  idle ? "flex-row justify-center gap-1" : "flex-col gap-1.5 pb-3.5",
                  isSelected
                    ? "text-app-fg"
                    : "bg-app-fill-strong text-app-fg group-hover:bg-[color-mix(in_oklch,var(--app-fg)_16%,transparent)]",
                )}
              >
                <motion.span
                  aria-hidden
                  className={cn("leading-none", idle ? "text-base" : "text-2xl")}
                  whileHover={reduceMotion ? undefined : { scale: 1.2, rotate: -8 }}
                  transition={SPRING_PRESS}
                >
                  {category.icon || "📦"}
                </motion.span>
                <span className="num text-[13px] leading-none font-semibold">
                  {idle ? "0" : formatShort(total)}
                </span>
              </motion.span>
            </motion.button>
          );
        })}

        {Array.from({ length: reserved }, (_, slot) => (
          <motion.span
            key={`reserved-${slot}`}
            layout={!reduceMotion}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={COLUMN}
          >
            <span
              style={{ height: `${GHOST_RATIO[data.length + slot] * 60}%` }}
              className="bg-app-fill block w-full rounded-3xl"
            />
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
