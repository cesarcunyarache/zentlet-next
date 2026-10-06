"use client";

import { useMemo } from "react";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type Mutation,
} from "@tanstack/react-query";
import { offlineSyncState } from "@/core/offline/offline-queue";
import { transactionService } from "../services/transaction.service";
import type { DateRange, TNewTransaction, TTransaction, TTransactionPayload, TransactionFilters } from "../types";
import { transactionKeys, transactionMutationKeys } from "./transaction.keys";
import {
  fetchSummaryWithPending,
  mergeSyncStates,
  pendingTransactionId,
  withPendingInPage,
  type DeleteVariables,
  type UpdateVariables,
} from "./pending-transactions";

export { transactionKeys, transactionMutationKeys } from "./transaction.keys";
export { fetchSummaryWithPending, withPendingInPage } from "./pending-transactions";
export { registerTransactionMutations } from "./transaction.mutations";

const PAGE_SIZE = 200;

export function useTransactionFeed(filters: TransactionFilters) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const page = await transactionService.getTransactionPage({ ...filters, cursor: pageParam, limit: PAGE_SIZE });
      return withPendingInPage(queryClient, page, filters, pageParam === null);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    placeholderData: keepPreviousData,
  });

  const transactions = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  return {
    transactions,
    isLoading: query.isLoading,
    isUnavailableOffline: query.isPending && query.fetchStatus === "paused",
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}

export function useTransactionSummary(range: DateRange) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: transactionKeys.summary(range),
    queryFn: () => fetchSummaryWithPending(queryClient, range),
    placeholderData: keepPreviousData,
  });
}

export function usePendingTransactions() {
  const states = useMutationState({
    filters: { mutationKey: transactionMutationKeys.all, status: "pending" },
    select: (mutation) => ({
      id: pendingTransactionId(mutation as Mutation<unknown, unknown, unknown>),
      state: offlineSyncState(mutation),
    }),
  });

  return useMemo(() => mergeSyncStates(states), [states]);
}

export function useTransactionMutations() {
  const create = useMutation<TTransaction, unknown, TNewTransaction>({ mutationKey: transactionMutationKeys.create });
  const update = useMutation<TTransaction, unknown, UpdateVariables>({ mutationKey: transactionMutationKeys.update });
  const remove = useMutation<void, unknown, DeleteVariables>({ mutationKey: transactionMutationKeys.remove });

  return {
    createTransaction: (payload: Omit<TNewTransaction, "id">) => create.mutate({ ...payload, id: crypto.randomUUID() }),
    updateTransaction: (transaction: TTransaction, data: Partial<TTransactionPayload>) =>
      update.mutate({ transactionId: transaction.id, data, previous: transaction }),
    deleteTransaction: (transaction: TTransaction) => remove.mutate(transaction),
  };
}
