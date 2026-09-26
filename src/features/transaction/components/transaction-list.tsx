"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { CloudOff, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@heroui/react";
import { useLocale, useTranslations } from "next-intl";
import { SPRING_LAYOUT } from "@/lib/ease";
import { CategoryEmoji } from "./category-emoji";
import { dayLabel, formatSigned, signedAmount } from "../lib/format";
import {
  SWIPE_ACTION,
  SWIPE_REVEAL,
  swipeOffset as offsetFor,
  swipeSideOnRelease,
  type SwipeSide,
} from "../lib/swipe";
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
  /** Deslizar la fila a la derecha descubre el botón de editar. */
  onRequestEdit?: (transaction: TTransaction) => void;
  /** Deslizar la fila a la izquierda descubre el botón de eliminar. */
  onRequestDelete?: (transaction: TTransaction) => void;
}


/**
 * Por encima de esto no se animan las posiciones: `layout` mide cada fila
 * en cada render y con cientos de filas se nota.
 */
const LAYOUT_ANIMATION_LIMIT = 120;

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
  onRequestEdit,
  onRequestDelete,
}: TransactionListProps) {
  const t = useTranslations("transactions");
  const locale = useLocale();
  const [open, setOpen] = useState<{ id: string; side: SwipeSide } | null>(null);
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
        {t("list.noMatches")}
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
            <div className="text-app-muted flex items-baseline justify-between px-3 pb-1.5 text-[13px]">
              <span className="lowercase first-letter:uppercase">{dayLabel(group.date, locale)}</span>
              <span className="num text-xs">{formatSigned(dayTotal(group.items), currency)}</span>
            </div>

            <AnimatePresence initial={false} mode="popLayout">
              {group.items.map((tx) => {
                const category = categoriesById.get(tx.categoryId);
                const amount = signedAmount(tx);
                const syncState = syncStateById?.get(tx.id);
                const syncLabel = syncState && t(`list.sync.${syncState}`);
                const delay = Math.min(row++, 8) * 0.03;
                const name = tx.description || category?.name || t("list.fallbackName");

                return (
                  <motion.div
                    key={tx.id}
                    layout={animateLayout}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { ...SPRING_LAYOUT, delay } }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, x: -28, transition: { duration: 0.2 } }
                    }
                    className="relative overflow-hidden rounded-2xl"
                  >
                    <SwipeRow
                      editLabel={t("list.editItem", { name })}
                      deleteLabel={t("list.deleteItem", { name })}
                      openSide={open?.id === tx.id ? open.side : null}
                      canEdit={Boolean(onRequestEdit)}
                      canDelete={Boolean(onRequestDelete)}
                      onOpenChange={(side) => setOpen(side ? { id: tx.id, side } : null)}
                      onPress={() => onSelect(tx)}
                      onEdit={() => {
                        setOpen(null);
                        onRequestEdit?.(tx);
                      }}
                      onDelete={() => {
                        setOpen(null);
                        onRequestDelete?.(tx);
                      }}
                    >
                    <CategoryEmoji
                      category={category}
                      className="size-12 rounded-full text-[22px] transition-transform duration-200 group-hover:scale-105 group-hover:-rotate-6"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-app-muted flex items-center gap-1.5 text-xs leading-[1.3]">
                        {category?.name ?? t("uncategorized")}
                        <AnimatePresence initial={false}>
                          {syncState && (
                            <motion.span
                              key="sync"
                              title={syncLabel}
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
                              <span className="sr-only">{syncLabel}</span>
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
                    </SwipeRow>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.section>
        ))}
      </AnimatePresence>

      {hasMore && (
        <EndSentinel isLoading={isLoadingMore} loadingLabel={t("list.loadingMore")} onReached={onEndReached} />
      )}
    </div>
  );
}


/**
 * Fila deslizable: a la derecha descubre editar (a la izquierda de la fila)
 * y a la izquierda, eliminar (a la derecha). Un toque con la fila abierta la
 * cierra en lugar de abrir el detalle.
 */
function SwipeRow({
  editLabel,
  deleteLabel,
  openSide,
  canEdit,
  canDelete,
  onOpenChange,
  onPress,
  onEdit,
  onDelete,
  children,
}: {
  editLabel: string;
  deleteLabel: string;
  openSide: SwipeSide | null;
  canEdit: boolean;
  canDelete: boolean;
  onOpenChange: (side: SwipeSide | null) => void;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const dragged = useRef(false);
  const x = useMotionValue(0);
  // quietos, los botones asomarían por las esquinas redondeadas de la fila
  const editOpacity = useTransform(x, [0, 16], [0, 1]);
  const deleteOpacity = useTransform(x, [-16, 0], [1, 0]);

  useEffect(() => {
    const controls = animate(x, offsetFor(openSide), SPRING_LAYOUT);
    return () => controls.stop();
  }, [openSide, x]);

  return (
    <>
      {canEdit && (
        <motion.button
          type="button"
          aria-label={editLabel}
          tabIndex={openSide === "edit" ? 0 : -1}
          onClick={onEdit}
          className="bg-app-fg text-app-surface absolute inset-y-0 left-0 grid place-items-center rounded-2xl"
          style={{ width: SWIPE_ACTION, opacity: editOpacity }}
        >
          <Pencil className="size-5" strokeWidth={2} aria-hidden />
        </motion.button>
      )}
      {canDelete && (
        <motion.button
          type="button"
          aria-label={deleteLabel}
          tabIndex={openSide === "delete" ? 0 : -1}
          onClick={onDelete}
          className="bg-app-expense text-app-surface absolute inset-y-0 right-0 grid place-items-center rounded-2xl"
          style={{ width: SWIPE_ACTION, opacity: deleteOpacity }}
        >
          <Trash2 className="size-5" strokeWidth={2} aria-hidden />
        </motion.button>
      )}
      <motion.button
        type="button"
        drag={canEdit || canDelete ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: canDelete ? -SWIPE_REVEAL : 0, right: canEdit ? SWIPE_REVEAL : 0 }}
        dragElastic={{ left: canDelete ? 0.15 : 0, right: canEdit ? 0.15 : 0 }}
        style={{ x }}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={(_, info) => {
          const side = swipeSideOnRelease({ offset: x.get(), velocity: info.velocity.x, canEdit, canDelete });
          // si el estado no cambia no hay render: se devuelve la fila a mano
          animate(x, offsetFor(side), SPRING_LAYOUT);
          onOpenChange(side);
          // el click que sigue al soltar no debe abrir el detalle
          setTimeout(() => (dragged.current = false), 0);
        }}
        onClick={() => {
          if (dragged.current) return;
          if (openSide) onOpenChange(null);
          else onPress();
        }}
        whileTap={{ scale: 0.98 }}
        className="group bg-app-bg hover:bg-[color-mix(in_oklch,var(--app-fg)_5%,var(--app-bg))] focus-visible:bg-[color-mix(in_oklch,var(--app-fg)_5%,var(--app-bg))] relative flex min-h-[64px] w-full touch-pan-y items-center gap-3.5 rounded-2xl px-3 py-2 text-left transition-colors"
      >
        {children}
      </motion.button>
    </>
  );
}

/** Pide la siguiente página un poco antes de llegar al final. */
function EndSentinel({
  isLoading,
  loadingLabel,
  onReached,
}: {
  isLoading: boolean;
  loadingLabel: string;
  onReached?: () => void;
}) {
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
          {loadingLabel}
        </>
      )}
    </div>
  );
}
