"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@heroui/react";
import { SPRING_LAYOUT } from "@/lib/ease";
import { CategoryEmoji } from "./category-emoji";
import { dayLabel, formatSigned, signedAmount } from "../lib/format";
import type { CategoryLike, TTransaction } from "../types";
import type { OfflineSyncState } from "@/core/offline/offline-queue";

interface TransactionListProps {
  transactions: TTransaction[];
  categoriesById: Map<string, CategoryLike>;
  currency: string;
  /** Distingue "no hay nada" de "el filtro no encontró nada". */
  hasAnyTransaction: boolean;
  /** Movimientos con cambios hechos sin conexión. */
  syncStateById?: Map<string, OfflineSyncState>;
  /** Quedan páginas por pedir al servidor. */
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onEndReached?: () => void;
  onSelect: (transaction: TTransaction) => void;
}

/**
 * Por encima de esto no se animan las posiciones: `layout` mide cada fila
 * en cada render y con cientos de filas se nota.
 */
const LAYOUT_ANIMATION_LIMIT = 120;

const SYNC_LABEL: Record<OfflineSyncState, string> = {
  paused: "Guardado en este dispositivo, se sincronizará al volver la conexión",
  syncing: "Sincronizando",
};

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
  hasMore = false,
  isLoadingMore = false,
  onEndReached,
  onSelect,
}: TransactionListProps) {
  const reduceMotion = useReducedMotion();
  const groups = useMemo(() => groupByDay(transactions), [transactions]);
  const isLarge = transactions.length > LAYOUT_ANIMATION_LIMIT;
  const animateLayout = !reduceMotion && !isLarge;

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
        {groups.map((group) => (
          <motion.section
            key={group.date}
            layout={animateLayout}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING_LAYOUT}
            className={cn(
              "[&+section]:mt-6",
              // fuera de pantalla el navegador no pinta los días lejanos
              isLarge && "[contain-intrinsic-size:auto_320px] [content-visibility:auto]",
            )}
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
                    layout={animateLayout}
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
                        <AnimatePresence initial={false}>
                          {syncState && (
                            <motion.span
                              key="sync"
                              title={SYNC_LABEL[syncState]}
                              initial={{ opacity: 0, scale: 0.6 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.6 }}
                              transition={{ duration: 0.2 }}
                              className="inline-flex"
                            >
                              {syncState === "paused" ? (
                                <CloudOff className="size-3" aria-hidden />
                              ) : (
                                <RefreshCw className="size-3 animate-spin" aria-hidden />
                              )}
                              <span className="sr-only">{SYNC_LABEL[syncState]}</span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                      <span className="text-app-fg block truncate text-base font-semibold tracking-[-0.01em]">
                        {tx.description}
                      </span>
                    </span>
                    <span className="num text-app-fg shrink-0 text-[15px] font-semibold">
                      {formatSigned(amount, currency)}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.section>
        ))}
      </AnimatePresence>

      {hasMore && <EndSentinel isLoading={isLoadingMore} onReached={onEndReached} />}
    </div>
  );
}

/** Pide la siguiente página un poco antes de llegar al final. */
function EndSentinel({ isLoading, onReached }: { isLoading: boolean; onReached?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onReachedRef = useRef(onReached);

  useEffect(() => {
    onReachedRef.current = onReached;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && onReachedRef.current?.(),
      { rootMargin: "0px 0px 800px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} role="status" className="text-app-muted flex h-14 items-center justify-center gap-2 text-xs font-semibold">
      {isLoading && (
        <>
          <RefreshCw className="size-3.5 animate-spin" aria-hidden />
          Cargando más movimientos…
        </>
      )}
    </div>
  );
}
