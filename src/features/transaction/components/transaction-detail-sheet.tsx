"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button, cn } from "@heroui/react";
import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { CategoryEmoji } from "./category-emoji";
import { formatSigned, fullDate, signedAmount } from "../lib/format";
import type { CategoryLike, TTransaction } from "../types";

interface TransactionDetailSheetProps {
  transaction: TTransaction | null;
  category?: CategoryLike;
  currency: string;
  onOpenChange: (open: boolean) => void;
  onEdit: (transaction: TTransaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionDetailSheet({
  transaction,
  category,
  currency,
  onOpenChange,
  onEdit,
  onDelete,
}: TransactionDetailSheetProps) {
  const t = useTranslations("transactions");
  const locale = useLocale();
  const amount = transaction ? signedAmount(transaction) : 0;

  // eliminar pide un segundo toque; la confirmación caduca sola
  const [confirming, setConfirming] = useState(false);
  const [lastId, setLastId] = useState(transaction?.id);
  if (transaction?.id !== lastId) {
    setLastId(transaction?.id);
    setConfirming(false);
  }

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3500);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <Sheet
      isOpen={Boolean(transaction)}
      onOpenChange={onOpenChange}
      title={t("detail.title")}
      footer={
        <div className="flex gap-2">
        <Button
          type="button"
          onPress={() => transaction && onEdit(transaction)}
          className="bg-app-fill text-app-fg hover:bg-app-fill-strong min-h-[50px] shrink-0 rounded-2xl px-5 text-base font-semibold transition-[background-color,transform] duration-200 active:scale-[0.98]"
        >
          <Pencil className="size-[17px]" strokeWidth={2.2} aria-hidden />
          {t("detail.edit")}
        </Button>
        <Button
          type="button"
          onPress={() => {
            if (!transaction) return;
            if (confirming) onDelete(transaction.id);
            else setConfirming(true);
          }}
          className={cn(
            "min-h-[50px] flex-1 overflow-hidden rounded-2xl text-base font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.98]",
            confirming
              ? "bg-app-expense text-app-surface"
              : "bg-app-expense-soft text-[color-mix(in_oklch,var(--app-expense)_78%,black)]",
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={confirming ? "confirm" : "idle"}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.16 }}
            >
              {t(confirming ? "detail.confirmDelete" : "detail.delete")}
            </motion.span>
          </AnimatePresence>
        </Button>
        </div>
      }
    >
      {transaction && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3.5 pt-2 pb-[18px]"
          >
            <CategoryEmoji
              category={category}
              className="size-[52px] rounded-2xl text-[25px]"
            />
            <span>
              <span className="font-display text-app-fg block text-[21px] font-bold tracking-[-0.02em]">
                {transaction.description}
              </span>
              <span className="text-app-muted block text-[13px]">
                {category?.name ?? t("uncategorized")}
              </span>
            </span>
          </motion.div>

          <dl className="border-app-border border-t">
            <Row label={t("fields.amount")}>
              <span
                className={cn(
                  "num font-semibold",
                  amount < 0 ? "text-app-expense" : "text-app-income",
                )}
              >
                {formatSigned(amount, currency)}
              </span>
            </Row>
            <Row label={t("fields.type")}>{t(`type.${transaction.type}`)}</Row>
            <Row label={t("fields.date")}>{fullDate(transaction.transactionDate, locale)}</Row>
          </dl>
        </>
      )}
    </Sheet>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-app-border flex items-center justify-between border-b px-0.5 py-[13px] text-sm">
      <dt className="text-app-muted m-0">{label}</dt>
      <dd className="text-app-fg m-0 font-semibold">{children}</dd>
    </div>
  );
}
