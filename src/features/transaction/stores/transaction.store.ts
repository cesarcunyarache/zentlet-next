"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { transactionService } from "../services/transaction.service";
import type { TTransaction, TTransactionPayload } from "../types";

/* ── query keys ──────────────────────────────────────────────────────── */

export const transactionKeys = {
  all: ["transactions"] as const,
  detail: (transactionId: string) => ["transactions", transactionId] as const,
};

function invalidateTransactions(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: transactionKeys.all });
}

/* ── hooks de acceso ─────────────────────────────────────────────────── */

/** Movimientos del usuario, ya ordenados por fecha descendente. */
export function useTransactions() {
  return useQuery({
    queryKey: transactionKeys.all,
    queryFn: () => transactionService.getTransactions(),
  });
}

export function useTransaction(transactionId: string | null | undefined) {
  return useQuery({
    queryKey: transactionKeys.detail(transactionId ?? ""),
    queryFn: () => transactionService.getTransaction(transactionId as string),
    enabled: Boolean(transactionId),
  });
}

/* ── mutaciones ──────────────────────────────────────────────────────── */

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TTransactionPayload) =>
      transactionService.createTransaction(data),
    // El id lo genera el servidor, así que no hay optimistic update.
    onSuccess: () => invalidateTransactions(queryClient),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      transactionId,
      data,
    }: {
      transactionId: string;
      data: Partial<TTransactionPayload>;
    }) => transactionService.updateTransaction(transactionId, data),
    onSuccess: (transaction) => {
      queryClient.setQueryData(
        transactionKeys.detail(transaction.id),
        transaction,
      );
      return invalidateTransactions(queryClient);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) =>
      transactionService.deleteTransaction(transactionId),

    /* Optimistic: borrar se dispara desde el detalle, que se cierra al
       instante; la fila no puede quedarse en la lista mientras viaja. */
    onMutate: async (transactionId) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.all });

      const previous = queryClient.getQueryData<TTransaction[]>(
        transactionKeys.all,
      );

      queryClient.setQueryData<TTransaction[]>(transactionKeys.all, (current) =>
        current?.filter((transaction) => transaction.id !== transactionId),
      );

      return { previous };
    },
    onError: (_error, _transactionId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(transactionKeys.all, context.previous);
      }
    },
    onSettled: (_data, _error, transactionId) => {
      queryClient.removeQueries({
        queryKey: transactionKeys.detail(transactionId),
      });
      return invalidateTransactions(queryClient);
    },
  });
}

/* ── fachada ─────────────────────────────────────────────────────────── */

/**
 * Punto de entrada para los componentes. Mismo contrato que
 * `useCategoryStore`: la vista no sabe nada de Axios ni de TanStack Query.
 */
export function useTransactionStore() {
  const query = useTransactions();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();

  return {
    transactions: query.data ?? [],

    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    createTransaction: create.mutateAsync,
    updateTransaction: update.mutateAsync,
    deleteTransaction: remove.mutateAsync,

    isCreating: create.isPending,
    isUpdating: update.isPending,
    isDeleting: remove.isPending,
    createError: create.error,
    updateError: update.error,
    deleteError: remove.error,
  };
}
