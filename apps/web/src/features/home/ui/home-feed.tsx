"use client";

import { useTranslations } from "next-intl";
import type { OfflineSyncState } from "@/core/offline/offline-queue";
import type { useTransactionFeed } from "@/features/transaction/stores/transaction.store";
import { TransactionList } from "@/features/transaction/ui/list/transaction-list";
import type { CategoryLike, TTransaction } from "@/features/transaction/types";
import { ListSkeleton } from "./list-skeleton";

interface HomeFeedProps {
  feed: ReturnType<typeof useTransactionFeed>;
  categoriesById: Map<string, CategoryLike>;
  currency: string;
  hasAnyTransaction: boolean;
  syncStateById: Map<string, OfflineSyncState>;
  onSelect: (transaction: TTransaction) => void;
  onRequestEdit: (transaction: TTransaction) => void;
  onRequestDelete: (transaction: TTransaction) => void;
}

export function HomeFeed({ feed, ...listProps }: HomeFeedProps) {
  const t = useTranslations("transactions.home");

  if (feed.isLoading) return <ListSkeleton />;

  if (feed.isUnavailableOffline) {
    return <p className="text-app-muted m-0 py-10 text-center text-sm">{t("offlineUnavailable")}</p>;
  }

  function loadMore() {
    const canLoadMore = feed.hasNextPage && !feed.isFetchingNextPage;
    if (canLoadMore) void feed.fetchNextPage();
  }

  return (
    <TransactionList
      {...listProps}
      transactions={feed.transactions}
      hasMore={feed.hasNextPage}
      isLoadingMore={feed.isFetchingNextPage}
      onEndReached={loadMore}
    />
  );
}
