"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { ToastBubble } from "@/core/components/ui/toast-bubble";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { useToast } from "@/core/hooks/useToast";
import { TransactionList } from "@/features/transaction/ui/list/transaction-list";
import { Link, useRouter } from "@/i18n/navigation";
import { track } from "@/lib/observability/client";
import { siteConfig } from "@/lib/site";
import { currencyOf, entryCategories, toTransaction } from "../../lib/entries";
import { listErrorKey } from "../../lib/errors";
import {
  useAddToList,
  useDeleteList,
  useListDetail,
  useListEntries,
  useRemoveFromList,
  useUpdateList,
} from "../../stores/list.store";
import type { TListDetail, TListEntry, TListPayload } from "../../types";
import { ListFormSheet } from "../form/list-form-sheet";
import { useListName } from "../../hooks/useListName";
import { ShareSheet } from "../share/share-sheet";
import { AddEntriesSheet } from "./add-entries-sheet";
import { ListEntrySheet } from "./list-entry-sheet";
import { ListSummary } from "./list-summary";

type Sheet = "edit" | "add" | "share" | null;

export function ListDetailView({ listId }: { listId: string }) {
  const t = useTranslations("lists");
  const { data: list, isLoading, isError } = useListDetail(listId);

  return (
    <div className="app-shell bg-app-bg text-app-fg min-h-dvh">
      <main className="mx-auto flex max-w-xl flex-col px-5 pt-[calc(14px+env(safe-area-inset-top))] pb-24 sm:px-6">
        <Link
          href={siteConfig.routes.app}
          aria-label={t("detail.back")}
          className="bg-app-fill hover:bg-app-fill-strong grid size-10 place-items-center rounded-full transition-colors"
        >
          <ArrowLeft className="size-5" strokeWidth={1.9} />
        </Link>

        {isLoading ? (
          <DetailSkeleton />
        ) : isError || !list ? (
          <p className="text-app-muted m-0 py-16 text-center text-sm">{t("detail.notFound")}</p>
        ) : (
          <LoadedList list={list} />
        )}
      </main>
    </div>
  );
}

function LoadedList({ list }: { list: TListDetail }) {
  const t = useTranslations("lists");
  const tTransactions = useTranslations("transactions");
  const router = useRouter();
  const { userId } = useOfflineSession();
  const { message, show: toast } = useToast();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [selected, setSelected] = useState<TListEntry | null>(null);

  const feed = useListEntries(list.id);
  const update = useUpdateList(list.id);
  const remove = useDeleteList();
  const add = useAddToList();
  const removeEntry = useRemoveFromList();

  const currency = currencyOf(list.currency);
  const isOwner = list.role === "owner";
  const listName = useListName();
  const canContribute = list.role !== "viewer";
  const isShared = list.memberCount > 1;
  const transactions = useMemo(() => feed.entries.map(toTransaction), [feed.entries]);
  const categoriesById = useMemo(() => entryCategories(feed.entries), [feed.entries]);
  const membersById = useMemo(() => new Map(list.members.map((member) => [member.userId, member])), [list.members]);
  const errorText = (error: unknown) => t(`errors.${listErrorKey(error)}`, { currency: list.currency });

  function saveList(payload: TListPayload) {
    update.mutate(payload, {
      onSuccess: () => {
        setSheet(null);
        toast(t("toast.updated"));
      },
    });
  }

  function deleteList() {
    remove.mutate(list.id, {
      onSuccess: () => {
        track("list_deleted", {});
        router.replace(siteConfig.routes.app);
      },
      onError: (error) => toast(errorText(error)),
    });
  }

  function addEntries(transactionIds: string[], onDone: () => void) {
    add.mutate(
      { listId: list.id, transactionIds },
      {
        onSuccess: () => {
          track("list_entries_added", { count: transactionIds.length, source: "list" });
          onDone();
          toast(t("toast.added"));
        },
      },
    );
  }

  function removeSelected(entry: TListEntry) {
    removeEntry.mutate(
      { listId: list.id, transactionId: entry.id },
      {
        onSuccess: () => {
          track("list_entry_removed", {});
          setSelected(null);
          toast(t("toast.removed"));
        },
        onError: (error) => toast(errorText(error)),
      },
    );
  }

  return (
    <>
      <header className="mt-6 mb-6 flex items-center gap-3.5">
        <CategoryEmoji category={list} className="size-14 rounded-[20px] text-[28px]" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display m-0 truncate text-[26px] leading-tight font-bold tracking-[-0.03em]">
            {listName(list)}
          </h1>
          <p className="text-app-muted m-0 text-[13px]">
            {t("count", { count: list.count })} · {t("detail.currency", { currency: list.currency })}
          </p>
        </div>
        {list.isPrivate ? null : (
          <button
            type="button"
            aria-label={t("detail.share")}
            onClick={() => setSheet("share")}
            className="bg-app-fill hover:bg-app-fill-strong text-app-muted hover:text-app-fg grid size-10 shrink-0 place-items-center rounded-full transition-colors"
          >
            <Users className="size-[18px]" strokeWidth={1.9} />
          </button>
        )}
        {isOwner && !list.isPrivate ? (
          <button
            type="button"
            aria-label={t("detail.edit")}
            onClick={() => {
              update.reset();
              setSheet("edit");
            }}
            className="bg-app-fill hover:bg-app-fill-strong text-app-muted hover:text-app-fg grid size-10 shrink-0 place-items-center rounded-full transition-colors"
          >
            <Pencil className="size-[18px]" strokeWidth={1.9} />
          </button>
        ) : null}
      </header>

      <ListSummary list={list} currency={currency} />

      {canContribute ? (
        <button
          type="button"
          onClick={() => {
            add.reset();
            setSheet("add");
          }}
          className="bg-app-fg text-app-surface mt-6 flex min-h-[50px] items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-transform active:scale-[0.98]"
        >
          <Plus className="size-5" strokeWidth={2.2} aria-hidden />
          {t("detail.add")}
        </button>
      ) : null}

      <h2 className="text-app-muted mt-8 mb-2 px-3 text-[13px] font-normal">{t("detail.entries")}</h2>
      {feed.isLoading ? null : transactions.length === 0 ? (
        <p className="text-app-muted m-0 py-8 text-center text-sm">{t("detail.emptyEntries")}</p>
      ) : (
        <TransactionList
          transactions={transactions}
          categoriesById={categoriesById}
          currency={currency}
          hasAnyTransaction
          hasMore={feed.hasNextPage}
          isLoadingMore={feed.isFetchingNextPage}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
          }}
          onSelect={(transaction) => setSelected(feed.entries.find((entry) => entry.id === transaction.id) ?? null)}
        />
      )}
      {feed.isError ? <p className="text-app-muted m-0 py-4 text-center text-sm">{tTransactions("list.noMatches")}</p> : null}

      <ToastBubble message={message} />

      <ListFormSheet
        isOpen={sheet === "edit"}
        list={list}
        isSaving={update.isPending}
        error={update.isError ? errorText(update.error) : null}
        onClose={() => setSheet(null)}
        onSubmit={saveList}
        onDelete={deleteList}
      />

      <ShareSheet
        list={list}
        userId={userId}
        isOpen={sheet === "share"}
        onOpenChange={(open) => setSheet(open ? "share" : null)}
        onToast={toast}
        onLeft={() => {
          track("list_left", {});
          router.replace(siteConfig.routes.app);
        }}
      />

      <AddEntriesSheet
        isOpen={sheet === "add"}
        listId={list.id}
        isShared={isShared}
        currency={currency}
        isSaving={add.isPending}
        error={add.isError ? errorText(add.error) : null}
        onOpenChange={(open) => setSheet(open ? "add" : null)}
        onSubmit={addEntries}
      />

      <ListEntrySheet
        entry={selected}
        author={selected && isShared ? membersById.get(selected.authorId) : undefined}
        currency={currency}
        canRemove={!list.isPrivate && (isOwner || selected?.authorId === userId)}
        isRemoving={removeEntry.isPending}
        onOpenChange={(open) => !open && setSelected(null)}
        onRemove={removeSelected}
      />
    </>
  );
}

function DetailSkeleton() {
  return (
    <div aria-hidden className="mt-6 flex flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <span className="bg-app-fill size-14 animate-pulse rounded-[20px]" />
        <span className="bg-app-fill h-6 w-40 animate-pulse rounded-full" />
      </div>
      <span className="bg-app-fill h-12 w-48 animate-pulse rounded-full" />
      <span className="bg-app-fill h-14 w-full animate-pulse rounded-2xl" />
    </div>
  );
}
