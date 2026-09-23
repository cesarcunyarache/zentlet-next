"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@heroui/react";
import { SPRING_LAYOUT } from "@/lib/ease";
import { CategoryEmoji } from "./category-emoji";
import { dayLabel, formatSigned, signedAmount } from "../lib/format";
import type { CategoryLike, TTransaction } from "../types";

interface TransactionListProps {
  transactions: TTransaction[];
  categoriesById: Map<string, CategoryLike>;
  currency: string;
  /** Distingue "no hay nada" de "el filtro no encontró nada". */
  hasAnyTransaction: boolean;
  onSelect: (transaction: TTransaction) => void;
}

interface DayGroup {
  date: string;
  items: TTransaction[];
}

function dayTotal(items: TTransaction[]) {
  return items.reduce((sum, tx) => sum + signedAmount(tx), 0);
}

function groupByDay(transactions: TTransaction[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const index = new Map<string, number>();

  for (const tx of transactions) {
    const at = index.get(tx.transactionDate);
    if (at === undefined) {
      index.set(tx.transactionDate, groups.length);
      groups.push({ date: tx.transactionDate, items: [tx] });
    } else {
      groups[at].items.push(tx);
    }
  }

  return groups;
}

export function TransactionList({
  transactions,
  categoriesById,
  currency,
  hasAnyTransaction,
  onSelect,
}: TransactionListProps) {
  const reduceMotion = useReducedMotion();

  if (!transactions.length) {
    if (!hasAnyTransaction) return null;
    return (
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-app-muted m-0 py-10 text-center text-sm"
      >
        Nada coincide con el filtro.
      </motion.p>
    );
  }

  // escalonado sólo en las primeras filas: una lista larga no debe hacerse esperar
  let row = 0;

  return (
    <div>
      <AnimatePresence initial={false} mode="popLayout">
        {groupByDay(transactions).map((group) => (
          <motion.section
            key={group.date}
            layout={!reduceMotion}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING_LAYOUT}
            className="[&+section]:mt-6"
          >
            <div className="text-app-muted flex items-baseline justify-between px-1 pb-1.5 text-[13px]">
              <span className="lowercase first-letter:uppercase">{dayLabel(group.date)}</span>
              <span className="num text-xs">{formatSigned(dayTotal(group.items), currency)}</span>
            </div>

            <AnimatePresence initial={false} mode="popLayout">
              {group.items.map((tx) => {
                const category = categoriesById.get(tx.categoryId);
                const amount = signedAmount(tx);
                const delay = Math.min(row++, 8) * 0.03;

                return (
                  <motion.button
                    key={tx.id}
                    layout={!reduceMotion}
                    type="button"
                    onClick={() => onSelect(tx)}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { ...SPRING_LAYOUT, delay } }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, x: -28, transition: { duration: 0.2 } }
                    }
                    whileTap={{ scale: 0.98 }}
                    className="group hover:bg-app-fill focus-visible:bg-app-fill flex min-h-[64px] w-full items-center gap-3.5 rounded-2xl px-1 py-2 text-left transition-colors"
                  >
                    <CategoryEmoji
                      category={category}
                      className="size-12 rounded-full text-[22px] transition-transform duration-200 group-hover:scale-105 group-hover:-rotate-6"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-app-muted block text-xs leading-[1.3]">
                        {category?.name ?? "Sin categoría"}
                      </span>
                      <span className="text-app-fg block truncate text-base font-semibold tracking-[-0.01em]">
                        {tx.description}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "num shrink-0 text-[15px] font-semibold",
                        amount < 0 ? "text-app-fg" : "text-app-income",
                      )}
                    >
                      {formatSigned(amount, currency)}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.section>
        ))}
      </AnimatePresence>
    </div>
  );
}
