"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button, cn } from "@heroui/react";
import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { formatSigned } from "@/lib/money";
import { fullDate } from "@/lib/dates";
import { signedAmount } from "../../lib/format";
import type { CategoryLike, TTransaction } from "../../types";
import { useDeleteConfirmation } from "../../hooks/useDeleteConfirmation";
import { TransactionRecurrenceRow } from "./transaction-recurrence-row";

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
  const { isConfirming, requestConfirmation } = useDeleteConfirmation(transaction?.id);

  function handleDelete() {
    if (!transaction) return;
    if (isConfirming) onDelete(transaction.id);
    else requestConfirmation();
  }

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
          <DeleteButton isConfirming={isConfirming} onPress={handleDelete} />
        </div>
      }
    >
      {transaction ? <TransactionDetails transaction={transaction} category={category} currency={currency} /> : null}
    </Sheet>
  );
}

interface DeleteButtonProps {
  isConfirming: boolean;
  onPress: () => void;
}

function DeleteButton({ isConfirming, onPress }: DeleteButtonProps) {
  const t = useTranslations("transactions.detail");

  return (
    <Button
      type="button"
      onPress={onPress}
      className={cn(
        "min-h-[50px] flex-1 overflow-hidden rounded-2xl text-base font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.98]",
        isConfirming
          ? "bg-app-expense text-app-surface"
          : "bg-app-expense-soft text-[color-mix(in_oklch,var(--app-expense)_78%,black)]",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isConfirming ? "confirm" : "idle"}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.16 }}
        >
          {t(isConfirming ? "confirmDelete" : "delete")}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}

interface TransactionDetailsProps {
  transaction: TTransaction;
  category?: CategoryLike;
  currency: string;
}

function TransactionDetails({ transaction, category, currency }: TransactionDetailsProps) {
  const t = useTranslations("transactions");
  const locale = useLocale();
  const amount = signedAmount(transaction);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3.5 pt-2 pb-[18px]"
      >
        <CategoryEmoji category={category} className="size-[52px] rounded-2xl text-[25px]" />
        <span>
          <span className="font-display text-app-fg block text-[21px] font-bold tracking-[-0.02em]">
            {transaction.description}
          </span>
          <span className="text-app-muted block text-[13px]">{category?.name ?? t("uncategorized")}</span>
        </span>
      </motion.div>

      <dl className="border-app-border border-t">
        <DetailRow label={t("fields.amount")}>
          <span className={cn("num font-semibold", amount < 0 ? "text-app-expense" : "text-app-income")}>
            {formatSigned(amount, currency)}
          </span>
        </DetailRow>
        <DetailRow label={t("fields.type")}>{t(`type.${transaction.type}`)}</DetailRow>
        <DetailRow label={t("fields.date")}>{fullDate(transaction.transactionDate, locale)}</DetailRow>
        {transaction.recurringTransactionId ? (
          <TransactionRecurrenceRow recurringTransactionId={transaction.recurringTransactionId} />
        ) : null}
      </dl>
    </>
  );
}

interface DetailRowProps {
  label: string;
  children: React.ReactNode;
}

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="border-app-border flex items-center justify-between border-b px-0.5 py-[13px] text-sm">
      <dt className="text-app-muted m-0">{label}</dt>
      <dd className="text-app-fg m-0 font-semibold">{children}</dd>
    </div>
  );
}
