import type { QueryClient } from "@tanstack/react-query";
import { emitSyncError } from "@/core/offline/sync-events";
import {
  SYNC_SCOPE,
  isNotFound,
  mutationRetryDelay,
  reportSyncFailure,
  shouldRetryMutation,
} from "@/core/offline/sync-policy";
import { transactionService } from "../services/transaction.service";
import { insertIntoFeed, matchesFilters, patchInFeed, removeFromFeed } from "../lib/feed-cache";
import type { TTransaction } from "../types";
import { findCached, updateFeeds, updateSummaries } from "./transaction.cache";
import { transactionKeys, transactionMutationKeys } from "./transaction.keys";
import { deletedId, type DeleteVariables, type UpdateVariables } from "./pending-transactions";

type TransactionErrorKey = "createTransaction" | "updateTransaction" | "deleteTransaction";

function reportError(error: unknown, key: TransactionErrorKey) {
  emitSyncError(key);
  reportSyncFailure(key, error);
}

function refreshWhenQueueDrains(queryClient: QueryClient) {
  if (queryClient.isMutating() <= 1) {
    return queryClient.invalidateQueries({ queryKey: transactionKeys.all });
  }
}

async function deleteIgnoringMissing(transactionId: string) {
  try {
    await transactionService.deleteTransaction(transactionId);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

export function registerTransactionMutations(queryClient: QueryClient) {
  const shared = {
    scope: SYNC_SCOPE,
    retry: shouldRetryMutation,
    retryDelay: mutationRetryDelay,
  };
  const cancelAll = () => queryClient.cancelQueries({ queryKey: transactionKeys.all });
  const refetchAll = () => void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
  const refreshWhenDrained = () => refreshWhenQueueDrains(queryClient);

  queryClient.setMutationDefaults(transactionMutationKeys.create, {
    ...shared,
    mutationFn: (transaction: TTransaction) => transactionService.createTransaction(transaction),
    onMutate: async (transaction: TTransaction) => {
      await cancelAll();
      updateFeeds(queryClient, (data, filters) =>
        matchesFilters(transaction, filters) ? insertIntoFeed(data, transaction) : data,
      );
      updateSummaries(queryClient, transaction, 1);
    },
    onError: (error: unknown, transaction: TTransaction) => {
      updateFeeds(queryClient, (data) => removeFromFeed(data, transaction.id));
      updateSummaries(queryClient, transaction, -1);
      reportError(error, "createTransaction");
    },
    onSettled: refreshWhenDrained,
  });

  queryClient.setMutationDefaults(transactionMutationKeys.update, {
    ...shared,
    mutationFn: ({ transactionId, data }: UpdateVariables) =>
      transactionService.updateTransaction(transactionId, data),
    onMutate: async ({ transactionId, data, previous: given }: UpdateVariables) => {
      await cancelAll();
      const previous = findCached(queryClient, transactionId) ?? given;
      if (!previous) return;
      const updated = { ...previous, ...data };
      updateFeeds(queryClient, (feed, filters) => patchInFeed(feed, updated, filters));
      updateSummaries(queryClient, previous, -1);
      updateSummaries(queryClient, updated, 1);
    },
    onSuccess: (transaction: TTransaction) => {
      queryClient.setQueryData(transactionKeys.detail(transaction.id), transaction);
    },
    onError: (error: unknown) => {
      refetchAll();
      reportError(error, "updateTransaction");
    },
    onSettled: refreshWhenDrained,
  });

  queryClient.setMutationDefaults(transactionMutationKeys.remove, {
    ...shared,
    mutationFn: (variables: DeleteVariables) => deleteIgnoringMissing(deletedId(variables)),
    onMutate: async (variables: DeleteVariables) => {
      await cancelAll();
      const id = deletedId(variables);
      const deleted = typeof variables === "string" ? findCached(queryClient, id) : variables;
      updateFeeds(queryClient, (data) => removeFromFeed(data, id));
      if (deleted) updateSummaries(queryClient, deleted, -1);
    },
    onError: (error: unknown) => {
      refetchAll();
      reportError(error, "deleteTransaction");
    },
    onSettled: (_data: unknown, _error: unknown, variables: DeleteVariables) => {
      queryClient.removeQueries({ queryKey: transactionKeys.detail(deletedId(variables)) });
      return refreshWhenDrained();
    },
  });
}
