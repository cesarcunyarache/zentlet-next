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
  type QueryClient,
} from "@tanstack/react-query";
import { emitSyncError } from "@/core/offline/sync-events";
import {
  SYNC_SCOPE,
  isNotFound,
  mutationRetryDelay,
  reportSyncFailure,
  shouldRetryMutation,
} from "@/core/offline/sync-policy";
import { pendingMutations } from "@/core/offline/pending-changes";
import { offlineSyncState, type OfflineSyncState } from "@/core/offline/offline-queue";
import { transactionService } from "../services/transaction.service";
import {
  applyToSummary,
  findInFeed,
  inRange,
  insertIntoFeed,
  matchesFilters,
  patchInFeed,
  removeFromFeed,
  type FeedData,
} from "../lib/feed-cache";
import type {
  DateRange,
  TTransaction,
  TTransactionPayload,
  TransactionFilters,
  TransactionPage,
  TransactionSummary,
} from "../types";

/** Suficiente para varios meses de uso sin que el dispositivo ni el servidor lo noten. */
export const PAGE_SIZE = 200;

/* ── claves ──────────────────────────────────────────────────────────── */

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: ["transactions", "list"] as const,
  list: (filters: TransactionFilters) => ["transactions", "list", filters] as const,
  summaries: ["transactions", "summary"] as const,
  summary: (range: DateRange) => ["transactions", "summary", range] as const,
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
/** Las colas guardadas antes del feed paginado llevan sólo el id. */
type DeleteVariables = TTransaction | string;

const deletedId = (variables: DeleteVariables) =>
  typeof variables === "string" ? variables : variables.id;

/* ── cambios pendientes ──────────────────────────────────────────────── */

type PendingChange =
  | { kind: "create"; row: TTransaction }
  | { kind: "update"; id: string; data: Partial<TTransactionPayload> }
  | { kind: "delete"; id: string; row?: TTransaction };

function toPendingChange(mutation: Mutation<unknown, unknown, unknown>): PendingChange | null {
  const kind = mutation.options.mutationKey?.[2];
  const variables = mutation.state.variables;
  if (kind === "create") return { kind: "create", row: variables as TTransaction };
  if (kind === "update") {
    const { transactionId, data } = variables as UpdateVariables;
    return { kind: "update", id: transactionId, data };
  }
  if (kind === "delete") {
    const deleted = variables as DeleteVariables;
    return { kind: "delete", id: deletedId(deleted), row: typeof deleted === "string" ? undefined : deleted };
  }
  return null;
}

function pendingChanges(queryClient: QueryClient) {
  return pendingMutations(queryClient, transactionMutationKeys.all)
    .map(toPendingChange)
    .filter((change) => change !== null);
}

/**
 * Una página recién traída del servidor todavía no incluye lo que sigue en
 * cola: sin esto, esas filas desaparecerían hasta sincronizar.
 */
function withPendingInPage(
  queryClient: QueryClient,
  page: TransactionPage,
  filters: TransactionFilters,
  isFirstPage: boolean,
): TransactionPage {
  let feed: FeedData = { pages: [page], pageParams: [null] };
  for (const change of pendingChanges(queryClient)) {
    if (change.kind === "create" && isFirstPage && matchesFilters(change.row, filters)) {
      feed = insertIntoFeed(feed, change.row);
    } else if (change.kind === "delete") {
      feed = removeFromFeed(feed, change.id);
    } else if (change.kind === "update") {
      const current = findInFeed(feed, change.id);
      if (current) feed = patchInFeed(feed, { ...current, ...change.data }, filters);
    }
  }
  return feed.pages[0];
}

/**
 * Totales del servidor más lo que sigue en cola. Un cambio en vuelo puede
 * haber llegado ya (la respuesta tarda, o se reenvió al reconectar): el
 * servidor dice qué ids tiene para no contarlo dos veces.
 */
async function fetchSummaryWithPending(queryClient: QueryClient, range: DateRange): Promise<TransactionSummary> {
  const pending = pendingChanges(queryClient).flatMap((change) => {
    const row = change.kind === "update" ? undefined : change.row;
    return row && inRange(row.transactionDate, range) ? [{ kind: change.kind, row }] : [];
  });

  const { presentIds, ...summary } = await transactionService.getSummary(
    range,
    pending.map(({ row }) => row.id),
  );
  const present = new Set(presentIds);

  return pending.reduce((current, { kind, row }) => {
    if (kind === "create" && !present.has(row.id)) return applyToSummary(current, row, 1);
    if (kind === "delete" && present.has(row.id)) return applyToSummary(current, row, -1);
    return current;
  }, summary);
}

/* ── cache local ─────────────────────────────────────────────────────── */

function feeds(queryClient: QueryClient) {
  return queryClient.getQueriesData<FeedData>({ queryKey: transactionKeys.lists });
}

function findCached(queryClient: QueryClient, id: string) {
  for (const [, data] of feeds(queryClient)) {
    const found = findInFeed(data, id);
    if (found) return found;
  }
  return undefined;
}

function updateFeeds(
  queryClient: QueryClient,
  update: (data: FeedData, filters: TransactionFilters) => FeedData,
) {
  for (const [key, data] of feeds(queryClient)) {
    if (data) queryClient.setQueryData<FeedData>(key, update(data, key[2] as TransactionFilters));
  }
}

function updateSummaries(queryClient: QueryClient, tx: TTransaction, sign: 1 | -1) {
  const summaries = queryClient.getQueriesData<TransactionSummary>({ queryKey: transactionKeys.summaries });
  for (const [key, summary] of summaries) {
    if (summary && inRange(tx.transactionDate, key[2] as DateRange)) {
      queryClient.setQueryData(key, applyToSummary(summary, tx, sign));
    }
  }
}

/**
 * Tras confirmarse una escritura se recarga, pero sólo cuando la cola
 * queda vacía: al vaciar una cola larga no hay un GET por cada envío.
 */
function refreshWhenQueueDrains(queryClient: QueryClient) {
  if (queryClient.isMutating() <= 1) {
    return queryClient.invalidateQueries({ queryKey: transactionKeys.all });
  }
}

function reportError(error: unknown, key: "createTransaction" | "updateTransaction" | "deleteTransaction") {
  emitSyncError(key);
  reportSyncFailure(key, error);
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
    onSettled: () => refreshWhenQueueDrains(queryClient),
  });

  queryClient.setMutationDefaults(transactionMutationKeys.update, {
    ...shared,
    mutationFn: ({ transactionId, data }: UpdateVariables) =>
      transactionService.updateTransaction(transactionId, data),
    onMutate: async ({ transactionId, data }: UpdateVariables) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.all });
      const previous = findCached(queryClient, transactionId);
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
      // el estado previo exacto lo trae el servidor
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      reportError(error, "updateTransaction");
    },
    onSettled: () => refreshWhenQueueDrains(queryClient),
  });

  queryClient.setMutationDefaults(transactionMutationKeys.remove, {
    ...shared,
    mutationFn: async (variables: DeleteVariables) => {
      try {
        await transactionService.deleteTransaction(deletedId(variables));
      } catch (error) {
        // ya no existía (otro dispositivo, otra pestaña): objetivo cumplido
        if (!isNotFound(error)) throw error;
      }
    },
    onMutate: async (variables: DeleteVariables) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.all });
      const id = deletedId(variables);
      const deleted = typeof variables === "string" ? findCached(queryClient, id) : variables;
      updateFeeds(queryClient, (data) => removeFromFeed(data, id));
      if (deleted) updateSummaries(queryClient, deleted, -1);
    },
    onError: (error: unknown) => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      reportError(error, "deleteTransaction");
    },
    onSettled: (_data: unknown, _error: unknown, variables: DeleteVariables) => {
      queryClient.removeQueries({ queryKey: transactionKeys.detail(deletedId(variables)) });
      return refreshWhenQueueDrains(queryClient);
    },
  });
}

/* ── hooks de acceso ─────────────────────────────────────────────────── */

/**
 * Movimientos filtrados y paginados en el servidor, de `PAGE_SIZE` en
 * `PAGE_SIZE`. Al cambiar de filtro se mantiene la lista anterior hasta
 * que llega la nueva.
 */
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

  const transactions = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  return {
    transactions,
    isLoading: query.isLoading,
    /** Sin conexión y sin nada guardado para este filtro. */
    isUnavailableOffline: query.isPending && query.fetchStatus === "paused",
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}

/** Totales del periodo y por categoría, calculados en la base de datos. */
export function useTransactionSummary(range: DateRange) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: transactionKeys.summary(range),
    queryFn: () => fetchSummaryWithPending(queryClient, range),
    placeholderData: keepPreviousData,
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
 * Movimientos con cambios hechos sin conexión: `paused` = guardado en el
 * dispositivo, esperando red; `syncing` = enviándose al volver la red. Un
 * guardado normal con conexión no aparece.
 */
export function usePendingTransactions() {
  const states = useMutationState({
    filters: { mutationKey: transactionMutationKeys.all, status: "pending" },
    select: (mutation) => {
      const change = toPendingChange(mutation as Mutation<unknown, unknown, unknown>);
      const id = change?.kind === "create" ? change.row.id : change?.id;
      return { id, state: offlineSyncState(mutation) };
    },
  });

  return useMemo(() => {
    const byId = new Map<string, OfflineSyncState>();
    for (const { id, state } of states) {
      // "paused" gana: el movimiento sigue teniendo algo en espera
      if (id && state && byId.get(id) !== "paused") byId.set(id, state);
    }
    return byId;
  }, [states]);
}

/**
 * Escrituras para los componentes. No se esperan: aplican el cambio en
 * local al instante y se sincronizan por detrás (en cola si no hay
 * conexión). Un rechazo posterior llega por `onSyncError`.
 */
export function useTransactionMutations() {
  const create = useMutation<TTransaction, unknown, TTransaction>({
    mutationKey: transactionMutationKeys.create,
  });
  const update = useMutation<TTransaction, unknown, UpdateVariables>({
    mutationKey: transactionMutationKeys.update,
  });
  const remove = useMutation<void, unknown, DeleteVariables>({
    mutationKey: transactionMutationKeys.remove,
  });

  return {
    /** Devuelve el movimiento ya con su id, sin esperar al servidor. */
    createTransaction: (payload: TTransactionPayload): TTransaction => {
      const transaction = { ...payload, id: crypto.randomUUID() };
      create.mutate(transaction);
      return transaction;
    },
    updateTransaction: (transactionId: string, data: Partial<TTransactionPayload>) =>
      update.mutate({ transactionId, data }),
    /** Recibe el movimiento completo: sin conexión hace falta para descontarlo de los totales. */
    deleteTransaction: (transaction: TTransaction) => remove.mutate(transaction),
  };
}
