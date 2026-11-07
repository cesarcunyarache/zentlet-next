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

const TEAR_SIZE = 16;
const TEAR_MASK = [
  "linear-gradient(#000 0 0) top / 100% calc(100% - 8px) no-repeat",
  `conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / ${TEAR_SIZE}px 8px repeat-x`,
].join(", ");

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
      hideTitle
      bodyClassName="flex flex-col"
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            onPress={() => transaction && onEdit(transaction)}
            className="bg-app-fg text-app-surface min-h-[50px] flex-1 rounded-2xl text-base font-semibold transition-transform duration-200 active:scale-[0.98]"
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
          : "bg-app-fill text-app-expense",
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-auto drop-shadow-[0_6px_18px_rgb(0_0_0/0.07)]"
    >
      <article
        className="bg-app-surface text-app-fg flex flex-col gap-4 px-5 pt-5 pb-9 font-mono"
        style={{ mask: TEAR_MASK, WebkitMask: TEAR_MASK }}
      >
        <header className="flex items-center justify-between gap-3">
          <CategoryEmoji category={category} className="size-10 rounded-xl text-xl" />
          <span className="text-app-muted text-[11px] tracking-[0.18em] uppercase">
            {t(`type.${transaction.type}`)}
          </span>
        </header>

        <Perforation />

        <div className="flex min-w-0 flex-col gap-1">
          <span className="line-clamp-2 text-lg leading-tight font-bold break-words uppercase">
            {transaction.description}
          </span>
          <span className="text-app-muted text-xs uppercase">{category?.name ?? t("uncategorized")}</span>
        </div>

        <Perforation />

        <span
          className={cn(
            "py-2 text-center text-[34px] leading-none font-bold tracking-tight tabular-nums",
            isExpense ? "text-app-expense" : "text-app-income",
          )}
        >
          {formatSigned(amount, currency)}
        </span>

        <Perforation />

        <dl className="m-0 [&_dt]:text-[11px] [&_dt]:tracking-wider [&_dt]:uppercase [&>*]:border-dashed [&>*:last-child]:border-b-0">
          <DetailRow label={t("fields.date")}>{fullDate(transaction.transactionDate, locale)}</DetailRow>
          {transaction.recurringTransactionId ? (
            <TransactionRecurrenceRow recurringTransactionId={transaction.recurringTransactionId} />
          ) : null}
          {children}
        </dl>
      </article>
    </motion.div>
  );
}

function Perforation() {
  return <hr aria-hidden className="border-app-border m-0 border-0 border-t border-dashed" />;
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
