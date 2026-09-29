"use client";

import { AnimatePresence, motion } from "motion/react";
import { CloudOff, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { OfflineSyncState } from "@/core/offline/offline-queue";
import { SPRING_LAYOUT } from "@/lib/ease";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { formatSigned } from "@/lib/money";
import { signedAmount } from "../../lib/format";
import type { SwipeSide } from "../../lib/swipe";
import type { CategoryLike, TTransaction } from "../../types";
import { rowEnterDelay, transactionName } from "../../lib/transaction-list";
import { SwipeRow } from "./swipe-row";

const ROW_EXIT = { opacity: 0, x: -28, transition: { duration: 0.2 } };
const ROW_EXIT_REDUCED = { opacity: 0 };
const ROW_INITIAL = { opacity: 0, y: 10 };

interface TransactionRowProps {
  ref?: React.Ref<HTMLDivElement>;
  transaction: TTransaction;
  category: CategoryLike | undefined;
  currency: string;
  rowIndex: number;
  syncState: OfflineSyncState | undefined;
  openSide: SwipeSide | null;
  shouldAnimateLayout: boolean;
  shouldReduceMotion: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onOpenChange: (side: SwipeSide | null) => void;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransactionRow({
  ref,
  transaction,
  category,
  currency,
  rowIndex,
  syncState,
  openSide,
  shouldAnimateLayout,
  shouldReduceMotion,
  canEdit,
  canDelete,
  onOpenChange,
  onSelect,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const t = useTranslations("transactions");
  const name = transactionName(transaction, category, t("list.fallbackName"));

  return (
    <motion.div
      ref={ref}
      layout={shouldAnimateLayout}
      initial={shouldReduceMotion ? false : ROW_INITIAL}
      animate={{ opacity: 1, y: 0, transition: { ...SPRING_LAYOUT, delay: rowEnterDelay(rowIndex) } }}
      exit={shouldReduceMotion ? ROW_EXIT_REDUCED : ROW_EXIT}
      className="relative overflow-hidden rounded-2xl"
    >
      <SwipeRow
        editLabel={t("list.editItem", { name })}
        deleteLabel={t("list.deleteItem", { name })}
        openSide={openSide}
        canEdit={canEdit}
        canDelete={canDelete}
        onOpenChange={onOpenChange}
        onPress={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
      >
        <CategoryEmoji
          category={category}
          className="size-12 rounded-full text-[22px] transition-transform duration-200 group-hover:scale-105 group-hover:-rotate-6"
        />
        <span className="min-w-0 flex-1">
          <span className="text-app-muted flex items-center gap-1.5 text-xs leading-[1.3]">
            {category?.name ?? t("uncategorized")}
            <AnimatePresence initial={false}>
              {syncState ? <SyncBadge key="sync" syncState={syncState} /> : null}
            </AnimatePresence>
          </span>
          <span className="text-app-fg block truncate text-base font-semibold tracking-[-0.01em]">
            {transaction.description}
          </span>
        </span>
        <span className="num text-app-fg shrink-0 text-[15px] font-semibold">
          {formatSigned(signedAmount(transaction), currency)}
        </span>
      </SwipeRow>
    </motion.div>
  );
}

function SyncBadge({ syncState }: { syncState: OfflineSyncState }) {
  const t = useTranslations("transactions.list.sync");
  const label = t(syncState);

  return (
    <motion.span
      title={label}
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
      <span className="sr-only">{label}</span>
    </motion.span>
  );
}
