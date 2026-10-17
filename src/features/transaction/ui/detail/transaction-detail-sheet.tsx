"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button, cn } from "@heroui/react";
import { Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { formatSigned } from "@/lib/money";
import { fullDate } from "@/lib/dates";
import { signedAmount } from "../../lib/format";
import type { CategoryLike, TTransaction } from "../../types";
import { useDeleteConfirmation } from "@/core/hooks/useDeleteConfirmation";
import { TransactionRecurrenceRow } from "./transaction-recurrence-row";

interface TransactionDetailSheetProps {
  transaction: TTransaction | null;
  category?: CategoryLike;
  currency: string;
  onOpenChange: (open: boolean) => void;
  onEdit: (transaction: TTransaction) => void;
  onDelete: (id: string) => void;
  children?: React.ReactNode;
}

export function TransactionDetailSheet({
  transaction,
  category,
  currency,
  onOpenChange,
  onEdit,
  onDelete,
  children,
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
      {transaction ? (
        <TransactionDetails transaction={transaction} category={category} currency={currency}>
          {children}
        </TransactionDetails>
      ) : null}
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
          <span className="flex items-center justify-center gap-2">
            <Trash2 className="size-[17px]" strokeWidth={2.2} aria-hidden />
            {t(isConfirming ? "confirmDelete" : "delete")}
          </span>
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}

interface TransactionDetailsProps {
  transaction: TTransaction;
  category?: CategoryLike;
  currency: string;
  children?: React.ReactNode;
}

function TransactionDetails({ transaction, category, currency, children }: TransactionDetailsProps) {
  const t = useTranslations("transactions");
  const locale = useLocale();
  const amount = signedAmount(transaction);

  const isExpense = amount < 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3 pt-2 pb-6 text-center"
      >
        <CategoryEmoji category={category} className="size-16 rounded-[22px] text-[30px]" />
        <span className="flex min-w-0 flex-col items-center gap-1">
          <span className="text-app-muted line-clamp-2 text-[15px] font-medium">{transaction.description}</span>
          <span
            className={cn(
              "num font-display text-[40px] leading-none font-bold tracking-[-0.03em]",
              isExpense ? "text-app-expense" : "text-app-income",
            )}
          >
            {formatSigned(amount, currency)}
          </span>
        </span>
        <span className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-semibold">
          <span className="bg-app-fill text-app-fg rounded-full px-2.5 py-1">
            {category?.name ?? t("uncategorized")}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1",
              isExpense ? "bg-app-expense-soft text-app-expense" : "bg-app-income-soft text-app-income",
            )}
          >
            {t(`type.${transaction.type}`)}
          </span>
        </span>
      </motion.div>

      <dl className="bg-app-fill m-0 rounded-2xl px-4 [&>*:last-child]:border-b-0">
        <DetailRow label={t("fields.date")}>{fullDate(transaction.transactionDate, locale)}</DetailRow>
        {transaction.recurringTransactionId ? (
          <TransactionRecurrenceRow recurringTransactionId={transaction.recurringTransactionId} />
        ) : null}
        {children}
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
    <div className="border-app-border flex items-center justify-between gap-3 border-b px-0.5 py-[13px] text-sm">
      <dt className="text-app-muted m-0 shrink-0">{label}</dt>
      <dd className="text-app-fg m-0 text-right font-semibold first-letter:uppercase">{children}</dd>
    </div>
  );
}
