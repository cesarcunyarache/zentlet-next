import type { QueryClient } from "@tanstack/react-query";
import { applyToSummary, findInFeed, inRange, type FeedData } from "../lib/feed-cache";
import type { DateRange, TTransaction, TransactionFilters, TransactionSummary } from "../types";
import { transactionKeys } from "./transaction.keys";

function feeds(queryClient: QueryClient) {
  return queryClient.getQueriesData<FeedData>({ queryKey: transactionKeys.lists });
}

export function findCached(queryClient: QueryClient, id: string) {
  for (const [, data] of feeds(queryClient)) {
    const found = findInFeed(data, id);
    if (found) return found;
  }
  return undefined;
}

type FeedUpdate = (data: FeedData, filters: TransactionFilters) => FeedData;

export function updateFeeds(queryClient: QueryClient, update: FeedUpdate) {
  for (const [key, data] of feeds(queryClient)) {
    if (data) queryClient.setQueryData<FeedData>(key, update(data, key[2] as TransactionFilters));
  }
}

export function updateSummaries(queryClient: QueryClient, tx: TTransaction, sign: 1 | -1) {
  const summaries = queryClient.getQueriesData<TransactionSummary>({ queryKey: transactionKeys.summaries });
  for (const [key, summary] of summaries) {
    if (summary && inRange(tx.transactionDate, key[2] as DateRange)) {
      queryClient.setQueryData(key, applyToSummary(summary, tx, sign));
    }
  }
}
