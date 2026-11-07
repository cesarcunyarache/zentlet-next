"use client";

import { motion } from "motion/react";
import { cn } from "@heroui/react";
import { useLocale, useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { formatSigned } from "@/lib/money";
import { fullDate } from "@/lib/dates";
import { signedAmount } from "../../lib/format";
import type { CategoryLike, TTransaction } from "../../types";
import { TransactionRecurrenceRow } from "./transaction-recurrence-row";

interface TransactionDetailSheetProps {
  transaction: TTransaction | null;
  category?: CategoryLike;
  currency: string;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}

export function TransactionDetailSheet({
  transaction,
  category,
  currency,
  onOpenChange,
  children,
}: TransactionDetailSheetProps) {
  const t = useTranslations("transactions");
  return (
    <Sheet
      isOpen={Boolean(transaction)}
      onOpenChange={onOpenChange}
      title={t("detail.title")}
      hideTitle
      bodyClassName="flex flex-col"
    >
      {transaction ? (
        <TransactionDetails transaction={transaction} category={category} currency={currency}>
          {children}
        </TransactionDetails>
      ) : null}
    </Sheet>
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
      className="my-auto"
    >
      <article className="text-app-fg flex flex-col gap-4 px-1 py-4 font-mono">
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
