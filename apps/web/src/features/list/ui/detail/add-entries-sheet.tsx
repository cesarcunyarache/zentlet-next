"use client";

import { useMemo, useState } from "react";
import { Button, cn } from "@heroui/react";
import { Check, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useDebounce } from "use-debounce";
import { Sheet } from "@/core/components/ui/sheet";
import { useCategoryStore } from "@/features/category/stores/category.store";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { useTransactionFeed } from "@/features/transaction/stores/transaction.store";
import { signedAmount } from "@/features/transaction/lib/format";
import { EndSentinel } from "@/features/transaction/ui/list/end-sentinel";
import type { CategoryLike, TTransaction } from "@/features/transaction/types";
import { dayLabel } from "@/lib/dates";
import { formatSigned } from "@/lib/money";
import { useEntrySelection } from "../../hooks/useEntrySelection";

const SEARCH_DEBOUNCE_MS = 300;

interface AddEntriesSheetProps {
  isOpen: boolean;
  listId: string;
  isShared: boolean;
  currency: string;
  isSaving: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (transactionIds: string[], onDone: () => void) => void;
}

export function AddEntriesSheet({ isOpen, listId, isShared, currency, isSaving, error, onOpenChange, onSubmit }: AddEntriesSheetProps) {
  const t = useTranslations("lists.add");
  const tTransactions = useTranslations("transactions");
  const tLists = useTranslations("lists");
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query.trim(), SEARCH_DEBOUNCE_MS);
  const feed = useTransactionFeed({ q: debouncedQuery || undefined });
  const selection = useEntrySelection();
  const { categories } = useCategoryStore();
  const categoriesById = useMemo(
    () => new Map<string, CategoryLike>((Array.isArray(categories) ? categories : []).map((c) => [c.id, c])),
    [categories],
  );

  function close() {
    setQuery("");
    selection.clear();
    onOpenChange(false);
  }

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => (open ? onOpenChange(true) : close())}
      title={t("title")}
      footer={
        <div className="flex flex-col gap-2">
          {isShared ? <p className="text-app-muted m-0 text-center text-xs text-balance">{tLists("privacy")}</p> : null}
          {error ? (
            <p role="alert" className="text-app-expense m-0 text-center text-sm">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            className="w-full"
            isDisabled={selection.ids.length === 0 || isSaving}
            onPress={() => onSubmit(selection.ids, close)}
          >
            <Check />
            {t("submit", { count: selection.ids.length })}
          </Button>
        </div>
      }
    >
      <label className="bg-app-fill mb-3 flex items-center gap-2 rounded-2xl px-3.5">
        <Search className="text-app-muted size-4 shrink-0" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className="placeholder:text-app-muted h-12 min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none"
        />
      </label>

      {!feed.isLoading && feed.transactions.length === 0 ? (
        <p className="text-app-muted m-0 py-8 text-center text-sm">{t("empty")}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {feed.transactions.map((transaction) => (
            <PickRow
              key={transaction.id}
              transaction={transaction}
              category={categoriesById.get(transaction.categoryId)}
              currency={currency}
              listId={listId}
              isSelected={selection.selected.has(transaction.id)}
              onToggle={() => selection.toggle(transaction.id)}
            />
          ))}
        </ul>
      )}

      {feed.hasNextPage ? (
        <EndSentinel
          isLoading={feed.isFetchingNextPage}
          loadingLabel={tTransactions("list.loadingMore")}
          onReached={() => {
            if (!feed.isFetchingNextPage) void feed.fetchNextPage();
          }}
        />
      ) : null}
    </Sheet>
  );
}

interface PickRowProps {
  transaction: TTransaction;
  category?: CategoryLike;
  currency: string;
  listId: string;
  isSelected: boolean;
  onToggle: () => void;
}

function PickRow({ transaction, category, currency, listId, isSelected, onToggle }: PickRowProps) {
  const t = useTranslations("lists.add");
  const locale = useLocale();
  const isHere = transaction.listId === listId;
  const isElsewhere = Boolean(transaction.listId) && !isHere;

  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={isHere || isSelected}
        disabled={isHere}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl px-1.5 py-2 text-left transition-colors disabled:opacity-60",
          isSelected ? "bg-app-fill" : "hover:bg-app-fill",
        )}
      >
        <CategoryEmoji category={category} className="size-10 rounded-full text-lg" />
        <span className="min-w-0 flex-1">
          <span className="text-app-muted flex items-center gap-1.5 text-xs">
            <span className="lowercase first-letter:uppercase">{dayLabel(transaction.transactionDate, locale)}</span>
            {isHere || isElsewhere ? (
              <span className="bg-app-fill-strong text-app-fg rounded-full px-1.5 py-px text-[10px] font-semibold">
                {t(isHere ? "inThisList" : "inOtherList")}
              </span>
            ) : null}
          </span>
          <span className="text-app-fg block truncate text-[15px] font-semibold">{transaction.description}</span>
        </span>
        <span className="num text-app-fg shrink-0 text-sm font-semibold">
          {formatSigned(signedAmount(transaction), currency)}
        </span>
        <span
          aria-hidden
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
            isHere || isSelected ? "bg-app-fg border-app-fg text-app-bg" : "border-app-border",
          )}
        >
          {isHere || isSelected ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </span>
      </button>
    </li>
  );
}
