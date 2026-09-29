"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@heroui/react";
import { useLocale, useTranslations } from "next-intl";
import type { OfflineSyncState } from "@/core/offline/offline-queue";
import { SPRING_LAYOUT } from "@/lib/ease";
import { dayLabel, formatSigned } from "../lib/format";
import type { SwipeSide } from "../lib/swipe";
import type { CategoryLike, TTransaction } from "../types";
import { EndSentinel } from "./end-sentinel";
import { dayTotal, groupByDay, groupStartIndexes, type DayGroup } from "./transaction-list.logic";
import { TransactionRow } from "./transaction-row";

const LAYOUT_ANIMATION_LIMIT = 120;

interface TransactionListProps {
  transactions: TTransaction[];
  categoriesById: Map<string, CategoryLike>;
  currency: string;
  hasAnyTransaction: boolean;
  syncStateById?: Map<string, OfflineSyncState>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onEndReached?: () => void;
  onSelect: (transaction: TTransaction) => void;
  onRequestEdit?: (transaction: TTransaction) => void;
  onRequestDelete?: (transaction: TTransaction) => void;
}

interface OpenRow {
  id: string;
  side: SwipeSide;
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
  const [openRow, setOpenRow] = useState<OpenRow | null>(null);
  const shouldReduceMotion = Boolean(useReducedMotion());
  const groups = useMemo(() => groupByDay(transactions), [transactions]);
  const startIndexes = useMemo(() => groupStartIndexes(groups), [groups]);
  const isLarge = transactions.length > LAYOUT_ANIMATION_LIMIT;
  const shouldAnimateLayout = !shouldReduceMotion && !isLarge;

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

  function renderRow(tx: TTransaction, rowIndex: number) {
    return (
      <TransactionRow
        key={tx.id}
        transaction={tx}
        category={categoriesById.get(tx.categoryId)}
        currency={currency}
        rowIndex={rowIndex}
        syncState={syncStateById?.get(tx.id)}
        openSide={openRow?.id === tx.id ? openRow.side : null}
        shouldAnimateLayout={shouldAnimateLayout}
        shouldReduceMotion={shouldReduceMotion}
        canEdit={Boolean(onRequestEdit)}
        canDelete={Boolean(onRequestDelete)}
        onOpenChange={(side) => setOpenRow(side ? { id: tx.id, side } : null)}
        onSelect={() => onSelect(tx)}
        onEdit={() => {
          setOpenRow(null);
          onRequestEdit?.(tx);
        }}
        onDelete={() => {
          setOpenRow(null);
          onRequestDelete?.(tx);
        }}
      />
    );
  }

  return (
    <div>
      <AnimatePresence initial={false} mode="popLayout">
        {groups.map((group, groupIndex) => (
          <DaySection
            key={group.date}
            group={group}
            currency={currency}
            isLarge={isLarge}
            shouldAnimateLayout={shouldAnimateLayout}
          >
            {group.items.map((tx, itemIndex) => renderRow(tx, startIndexes[groupIndex] + itemIndex))}
          </DaySection>
        ))}
      </AnimatePresence>

      {hasMore ? (
        <EndSentinel isLoading={isLoadingMore} loadingLabel={t("list.loadingMore")} onReached={onEndReached} />
      ) : null}
    </div>
  );
}

interface DaySectionProps {
  ref?: React.Ref<HTMLElement>;
  group: DayGroup;
  currency: string;
  isLarge: boolean;
  shouldAnimateLayout: boolean;
  children: React.ReactNode;
}

function DaySection({ ref, group, currency, isLarge, shouldAnimateLayout, children }: DaySectionProps) {
  const locale = useLocale();

  return (
    <motion.section
      ref={ref}
      layout={shouldAnimateLayout}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={SPRING_LAYOUT}
      className={cn(
        "[&+section]:mt-6",
        isLarge && "[contain-intrinsic-size:auto_320px] [content-visibility:auto]",
      )}
    >
      <div className="text-app-muted flex items-baseline justify-between px-3 pb-1.5 text-[13px]">
        <span className="lowercase first-letter:uppercase">{dayLabel(group.date, locale)}</span>
        <span className="num text-xs">{formatSigned(dayTotal(group.items), currency)}</span>
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {children}
      </AnimatePresence>
    </motion.section>
  );
}
