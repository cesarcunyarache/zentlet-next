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
  /** Movimientos aún no confirmados por el servidor. */
  syncStateById?: Map<string, "paused" | "syncing">;
  onSelect: (transaction: TTransaction) => void;
}

const SYNC_LABEL = { paused: "Pendiente", syncing: "Sincronizando…" } as const;

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
  syncStateById,
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
                const syncState = syncStateById?.get(tx.id);
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
                      <span className="text-app-muted flex items-center gap-1.5 text-xs leading-[1.3]">
                        {category?.name ?? "Sin categoría"}
                        {syncState && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10.5px] font-semibold",
                              syncState === "paused" ? "bg-app-fill text-app-fg" : "text-app-muted",
                            )}
                          >
                            <span
                              aria-hidden
                              className={cn(
                                "size-1.5 rounded-full",
                                syncState === "paused" ? "bg-[oklch(0.78_0.15_75)]" : "bg-app-muted animate-pulse",
                              )}
                            />
                            {SYNC_LABEL[syncState]}
                          </span>
                        )}
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
