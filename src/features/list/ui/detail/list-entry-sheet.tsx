"use client";

import { cn } from "@heroui/react";
import { useLocale, useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { useDeleteConfirmation } from "@/features/transaction/hooks/useDeleteConfirmation";
import { fullDate } from "@/lib/dates";
import { formatSigned } from "@/lib/money";
import type { TListEntry, TListMember } from "../../types";

interface ListEntrySheetProps {
  entry: TListEntry | null;
  author?: TListMember;
  currency: string;
  canRemove: boolean;
  isRemoving: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (entry: TListEntry) => void;
}

export function ListEntrySheet({
  entry,
  author,
  currency,
  canRemove,
  isRemoving,
  onOpenChange,
  onRemove,
}: ListEntrySheetProps) {
  const t = useTranslations("lists.entry");
  const { isConfirming, requestConfirmation } = useDeleteConfirmation(entry?.id);

  return (
    <Sheet
      isOpen={Boolean(entry)}
      onOpenChange={onOpenChange}
      title={t("title")}
      footer={
        entry && canRemove ? (
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              disabled={isRemoving}
              onClick={() => (isConfirming ? onRemove(entry) : requestConfirmation())}
              className={cn(
                "min-h-[50px] w-full rounded-2xl text-base font-semibold transition-colors disabled:opacity-50",
                isConfirming ? "bg-app-expense text-app-surface" : "bg-app-expense-soft text-app-expense",
              )}
            >
              {t(isConfirming ? "confirmRemove" : "remove")}
            </button>
            <p className="text-app-muted m-0 text-xs">{t("removeHint")}</p>
          </div>
        ) : undefined
      }
    >
      {entry ? <EntryDetails entry={entry} author={author} currency={currency} /> : null}
    </Sheet>
  );
}

function EntryDetails({ entry, author, currency }: { entry: TListEntry; author?: TListMember; currency: string }) {
  const t = useTranslations("lists.entry");
  const tTransactions = useTranslations("transactions");
  const locale = useLocale();
  const amount = entry.type === "expense" ? -entry.amount : entry.amount;

  return (
    <>
      <div className="flex items-center gap-3.5 pt-2 pb-[18px]">
        <CategoryEmoji category={entry.category} className="size-[52px] rounded-2xl text-[25px]" />
        <span>
          <span className="font-display text-app-fg block text-[21px] font-bold tracking-[-0.02em]">
            {entry.description}
          </span>
          <span className="text-app-muted block text-[13px]">{entry.category.name}</span>
        </span>
      </div>

      <dl className="border-app-border border-t">
        <Row label={tTransactions("fields.amount")}>
          <span className={cn("num font-semibold", amount < 0 ? "text-app-expense" : "text-app-income")}>
            {formatSigned(amount, currency)}
          </span>
        </Row>
        <Row label={tTransactions("fields.date")}>{fullDate(entry.transactionDate, locale)}</Row>
        {author ? <Row label={t("author")}>{author.name}</Row> : null}
      </dl>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-app-border flex items-center justify-between border-b px-0.5 py-[13px] text-sm">
      <dt className="text-app-muted m-0">{label}</dt>
      <dd className="text-app-fg m-0 font-semibold">{children}</dd>
    </div>
  );
}
