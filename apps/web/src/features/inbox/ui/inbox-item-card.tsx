"use client";

import { cn } from "@heroui/react";
import { Check, Copy, ShieldAlert, Sparkles, UserPlus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { CategoryBase } from "@/features/category/types";
import { dayLabel } from "@/lib/dates";
import { toCurrencyCode } from "@/features/preference/lib/currency";
import { useInboxItemReview } from "../hooks/useInboxItemReview";
import type { TInboxItem } from "../types";
import { InboxCategoryPicker } from "./inbox-category-picker";

interface InboxItemCardProps {
  item: TInboxItem;
  currency: string;
  categories: CategoryBase[];
}

function Badge({ icon, children, tone = "muted" }: { icon: React.ReactNode; children: React.ReactNode; tone?: "muted" | "warn" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "warn" ? "bg-app-expense-soft text-app-expense" : "bg-app-fill text-app-muted",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function InboxItemCard({ item, currency, categories }: InboxItemCardProps) {
  const t = useTranslations("inbox.item");
  const tTransactions = useTranslations("transactions");
  const locale = useLocale();
  const review = useInboxItemReview(item);
  const { draft } = review;
  const isIncome = draft.type === "income";
  const isForeign = item.currency !== null && toCurrencyCode(item.currency) !== toCurrencyCode(currency);

  return (
    <li className="bg-app-surface flex flex-col gap-3 rounded-3xl p-4 ring-1 ring-[var(--app-border)]">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-app-muted truncate font-semibold">
          {item.bank ?? item.senderAddress}
          {item.cardLast4 ? ` · ${t("card", { last4: item.cardLast4 })}` : ""}
        </span>
        <span className="text-app-muted shrink-0">{dayLabel(item.transactionDate, locale)}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {item.isLearned ? <Badge icon={<Sparkles className="size-3" aria-hidden />}>{t("learned")}</Badge> : null}
        {item.duplicateOfId ? (
          <Badge tone="warn" icon={<Copy className="size-3" aria-hidden />}>
            {t("duplicate")}
          </Badge>
        ) : null}
        {item.isNewSender ? <Badge icon={<UserPlus className="size-3" aria-hidden />}>{t("newSender")}</Badge> : null}
        {!item.isVerified ? (
          <Badge tone="warn" icon={<ShieldAlert className="size-3" aria-hidden />}>
            {t("unverified")}
          </Badge>
        ) : null}
        {isForeign ? <Badge tone="warn" icon={null}>{t("foreignCurrency", { currency: item.currency ?? "" })}</Badge> : null}
      </div>

      <div className="flex items-baseline gap-2">
        <button
          type="button"
          onClick={() => review.update({ type: isIncome ? "expense" : "income" })}
          aria-label={tTransactions(`type.${draft.type}`)}
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
            isIncome ? "bg-app-income-soft text-app-income" : "bg-app-expense-soft text-app-expense",
          )}
        >
          {isIncome ? "+" : "−"} {currency}
        </button>
        <input
          aria-label={tTransactions("fields.amount")}
          inputMode="decimal"
          value={draft.rawAmount}
          onChange={(event) => review.update({ rawAmount: event.target.value })}
          className="font-display text-app-fg w-full min-w-0 bg-transparent text-[30px] leading-none font-bold tracking-[-0.03em] tabular-nums outline-none"
        />
      </div>

      <input
        aria-label={tTransactions("fields.description")}
        value={draft.description}
        maxLength={42}
        onChange={(event) => review.update({ description: event.target.value })}
        className="bg-app-fill text-app-fg focus:ring-app-fg/20 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2"
      />
      {item.merchant && item.merchant !== draft.description ? (
        <p className="text-app-muted -mt-1.5 m-0 text-xs">{t("merchant", { merchant: item.merchant })}</p>
      ) : null}

      <InboxCategoryPicker
        label={tTransactions("fields.category")}
        categories={categories}
        selectedId={draft.categoryId}
        onPick={(categoryId) => review.update({ categoryId })}
      />

      {review.hasFailed ? (
        <p role="alert" className="text-app-expense m-0 text-xs font-semibold">
          {t("failed")}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={review.discard}
          disabled={review.isWorking}
          className="bg-app-fill text-app-fg hover:bg-app-fill-strong flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold disabled:opacity-50"
        >
          <X className="size-4" strokeWidth={2.2} aria-hidden />
          {t("dismiss")}
        </button>
        <button
          type="button"
          onClick={review.confirm}
          disabled={!review.canAccept || review.isWorking}
          className="bg-app-fg text-app-surface disabled:bg-app-fill-strong disabled:text-app-muted flex min-h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold"
        >
          <Check className="size-4" strokeWidth={2.4} aria-hidden />
          {review.canAccept ? t("accept") : t("pickCategory")}
        </button>
      </div>
    </li>
  );
}
