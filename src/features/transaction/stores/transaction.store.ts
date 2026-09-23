"use client";

import { useMemo } from "react";
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type Mutation,
  type QueryClient,
} from "@tanstack/react-query";
import { getApiErrorMessage } from "@/core/services/api-error";
import { emitSyncError } from "@/core/offline/sync-events";
import {
  SYNC_SCOPE,
  isNotFound,
  mutationRetryDelay,
  shouldRetryMutation,
} from "@/core/offline/sync-policy";
import {
  applyPendingChanges,
  pendingMutations,
  type PendingChange,
} from "@/core/offline/pending-changes";
import { transactionService } from "../services/transaction.service";
import type { TTransaction, TTransactionPayload } from "../types";

/* ── claves ──────────────────────────────────────────────────────────── */

export const transactionKeys = {
  all: ["transactions"] as const,
  detail: (transactionId: string) => ["transactions", transactionId] as const,
};

/**
 * Las mutaciones llevan clave para poder registrar sus funciones por
 * defecto: una mutación guardada sin conexión se restaura tras recargar y
 * necesita volver a encontrar su `mutationFn` (una función no se serializa).
 */
export const transactionMutationKeys = {
  all: ["transactions", "mutation"] as const,
  create: ["transactions", "mutation", "create"] as const,
  update: ["transactions", "mutation", "update"] as const,
  remove: ["transactions", "mutation", "delete"] as const,
};

type UpdateVariables = { transactionId: string; data: Partial<TTransactionPayload> };

/* ── cambios pendientes ──────────────────────────────────────────────── */

function toPendingChange(mutation: Mutation<unknown, unknown, unknown>): PendingChange<TTransaction> | null {
  const kind = mutation.options.mutationKey?.[2];
  const variables = mutation.state.variables;
  if (kind === "create") return { kind: "create", row: variables as TTransaction };
  if (kind === "update") {
    const { transactionId, data } = variables as UpdateVariables;
    return { kind: "update", id: transactionId, data };
  }
  if (kind === "delete") return { kind: "delete", id: variables as string };
  return null;
}

/** La lista del servidor con las escrituras que aún no le han llegado. */
function withPendingChanges(queryClient: QueryClient, rows: TTransaction[]) {
  const changes = pendingMutations(queryClient, transactionMutationKeys.all)
    .map(toPendingChange)
    .filter((change) => change !== null);
  return applyPendingChanges(rows, changes);
}

function setList(queryClient: QueryClient, update: (rows: TTransaction[]) => TTransaction[]) {
  queryClient.setQueryData<TTransaction[]>(transactionKeys.all, (current) => update(current ?? []));
}

/**
 * Tras confirmarse una escritura se recarga la lista, pero sólo cuando la
 * cola queda vacía: al vaciar una cola larga no hay un GET por cada envío.
 */
function refreshWhenQueueDrains(queryClient: QueryClient) {
  if (queryClient.isMutating() <= 1) {
    return queryClient.invalidateQueries({ queryKey: transactionKeys.all });
  }
}

function reportError(error: unknown, fallback: string) {
  emitSyncError(getApiErrorMessage(error, fallback));
}

/* ── registro (antes de restaurar la cache persistida) ───────────────── */

export function registerTransactionMutations(queryClient: QueryClient) {
  const shared = {
    scope: SYNC_SCOPE,
    retry: shouldRetryMutation,
    retryDelay: mutationRetryDelay,
  };

  queryClient.setMutationDefaults(transactionMutationKeys.create, {
    ...shared,
    mutationFn: (transaction: TTransaction) => transactionService.createTransaction(transaction),
    onMutate: async (transaction: TTransaction) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.all });
      setList(queryClient, (rows) => [transaction, ...rows.filter((row) => row.id !== transaction.id)]);
    },
    onError: (error: unknown, transaction: TTransaction) => {
      setList(queryClient, (rows) => rows.filter((row) => row.id !== transaction.id));
      reportError(error, "No se pudo guardar el movimiento");
    },
    onSettled: () => refreshWhenQueueDrains(queryClient),
  });

  queryClient.setMutationDefaults(transactionMutationKeys.update, {
    ...shared,
    mutationFn: ({ transactionId, data }: UpdateVariables) =>
      transactionService.updateTransaction(transactionId, data),
    onMutate: async ({ transactionId, data }: UpdateVariables) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.all });
      setList(queryClient, (rows) =>
        rows.map((row) => (row.id === transactionId ? { ...row, ...data } : row)),
      );
    },
    onSuccess: (transaction: TTransaction) => {
      queryClient.setQueryData(transactionKeys.detail(transaction.id), transaction);
    },
    onError: (error: unknown) => {
      // el estado previo exacto lo trae el servidor
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      reportError(error, "No se pudo actualizar el movimiento");
    },
    onSettled: () => refreshWhenQueueDrains(queryClient),
  });

  queryClient.setMutationDefaults(transactionMutationKeys.remove, {
    ...shared,
    mutationFn: async (transactionId: string) => {
      try {
        await transactionService.deleteTransaction(transactionId);
      } catch (error) {
        // ya no existía (otro dispositivo, otra pestaña): objetivo cumplido
        if (!isNotFound(error)) throw error;
      }
    },
    onMutate: async (transactionId: string) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.all });
      setList(queryClient, (rows) => rows.filter((row) => row.id !== transactionId));
    },
    onError: (error: unknown) => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      reportError(error, "No se pudo eliminar el movimiento");
    },
    onSettled: (_data: unknown, _error: unknown, transactionId: string) => {
      queryClient.removeQueries({ queryKey: transactionKeys.detail(transactionId) });
      return refreshWhenQueueDrains(queryClient);
    },
  });
}

/* ── hooks de acceso ─────────────────────────────────────────────────── */

/** Movimientos del usuario, ya ordenados por fecha descendente. */
export function useTransactions() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: transactionKeys.all,
    queryFn: async () => withPendingChanges(queryClient, await transactionService.getTransactions()),
  });
}

export function useTransaction(transactionId: string | null | undefined) {
  return useQuery({
    queryKey: transactionKeys.detail(transactionId ?? ""),
    queryFn: () => transactionService.getTransaction(transactionId as string),
    enabled: Boolean(transactionId),
  });
}

/**
 * Estado de sincronización por movimiento: `paused` = guardado en el
 * dispositivo, esperando conexión; `syncing` = enviándose.
 */
export function usePendingTransactions() {
  const states = useMutationState({
    filters: { mutationKey: transactionMutationKeys.all, status: "pending" },
    select: (mutation) => {
      const change = toPendingChange(mutation as Mutation<unknown, unknown, unknown>);
      const id = change?.kind === "create" ? change.row.id : change?.id;
      return { id, paused: mutation.state.isPaused };
    },
  });

  return useMemo(() => {
    const byId = new Map<string, "paused" | "syncing">();
    for (const { id, paused } of states) {
      if (id) byId.set(id, paused ? "paused" : "syncing");
    }
    return byId;
  }, [states]);
}

/* ── fachada ─────────────────────────────────────────────────────────── */

/**
 * Punto de entrada para los componentes. Las escrituras no se esperan:
 * aplican el cambio en local al instante y se sincronizan por detrás (en
 * cola si no hay conexión). Un rechazo posterior llega por `onSyncError`.
 */
export function useTransactionStore() {
  const query = useTransactions();
  const create = useMutation<TTransaction, unknown, TTransaction>({
    mutationKey: transactionMutationKeys.create,
  });
  const update = useMutation<TTransaction, unknown, UpdateVariables>({
    mutationKey: transactionMutationKeys.update,
  });
  const remove = useMutation<void, unknown, string>({
    mutationKey: transactionMutationKeys.remove,
  });

  return {
    transactions: query.data ?? [],

    /** Primera carga sin nada en cache (ni en memoria ni en el dispositivo). */
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    /** Devuelve el movimiento ya con su id, sin esperar al servidor. */
    createTransaction: (payload: TTransactionPayload): TTransaction => {
      const transaction = { ...payload, id: crypto.randomUUID() };
      create.mutate(transaction);
      return transaction;
    },
    updateTransaction: (transactionId: string, data: Partial<TTransactionPayload>) =>
      update.mutate({ transactionId, data }),
    deleteTransaction: (transactionId: string) => remove.mutate(transactionId),
  };
}
