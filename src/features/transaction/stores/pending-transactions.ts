import type { Mutation, QueryClient } from "@tanstack/react-query";
import { pendingMutations } from "@/core/offline/pending-changes";
import type { OfflineSyncState } from "@/core/offline/offline-queue";
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
import { transactionMutationKeys } from "./transaction.keys";

export type UpdateVariables = {
  transactionId: string;
  data: Partial<TTransactionPayload>;
  previous?: TTransaction;
};
export type DeleteVariables = TTransaction | string;

type PendingChange =
  | { kind: "create"; row: TTransaction }
  | { kind: "update"; id: string; data: Partial<TTransactionPayload>; previous?: TTransaction; paused: boolean }
  | { kind: "delete"; id: string; row?: TTransaction };

type SummaryAdjustment = { kind: "create" | "delete" | "undo" | "redo"; row: TTransaction };

export const deletedId = (variables: DeleteVariables) =>
  typeof variables === "string" ? variables : variables.id;

export function toPendingChange(mutation: Mutation<unknown, unknown, unknown>): PendingChange | null {
  const kind = mutation.options.mutationKey?.[2];
  const variables = mutation.state.variables;

  switch (kind) {
    case "create":
      return { kind: "create", row: variables as TTransaction };
    case "update": {
      const { transactionId, data, previous } = variables as UpdateVariables;
      return { kind: "update", id: transactionId, data, previous, paused: mutation.state.isPaused };
    }
    case "delete": {
      const deleted = variables as DeleteVariables;
      return { kind: "delete", id: deletedId(deleted), row: typeof deleted === "string" ? undefined : deleted };
    }
    default:
      return null;
  }
}

function pendingChanges(queryClient: QueryClient) {
  return pendingMutations(queryClient, transactionMutationKeys.all)
    .map(toPendingChange)
    .filter((change) => change !== null);
}

function applyToPage(
  feed: FeedData,
  change: PendingChange,
  filters: TransactionFilters,
  isFirstPage: boolean,
): FeedData {
  switch (change.kind) {
    case "create":
      return isFirstPage && matchesFilters(change.row, filters) ? insertIntoFeed(feed, change.row) : feed;
    case "delete":
      return removeFromFeed(feed, change.id);
    case "update": {
      const current = findInFeed(feed, change.id);
      return current ? patchInFeed(feed, { ...current, ...change.data }, filters) : feed;
    }
  }
}

export function withPendingInPage(
  queryClient: QueryClient,
  page: TransactionPage,
  filters: TransactionFilters,
  isFirstPage: boolean,
): TransactionPage {
  const initial: FeedData = { pages: [page], pageParams: [null] };
  const feed = pendingChanges(queryClient).reduce(
    (current, change) => applyToPage(current, change, filters, isFirstPage),
    initial,
  );
  return feed.pages[0];
}

function withQueuedEdits(row: TTransaction, changes: PendingChange[]) {
  return changes.reduce(
    (current, change) => (change.kind === "update" && change.id === row.id ? { ...current, ...change.data } : current),
    row,
  );
}

function toAdjustments(change: PendingChange, changes: PendingChange[], createdIds: Set<string>): SummaryAdjustment[] {
  switch (change.kind) {
    case "create":
      return [{ kind: "create", row: withQueuedEdits(change.row, changes) }];
    case "delete":
      return change.row ? [{ kind: "delete", row: change.row }] : [];
    case "update": {
      const { previous } = change;
      const isPausedEditOfSyncedRow = change.paused && previous && !createdIds.has(change.id);
      if (!isPausedEditOfSyncedRow) return [];
      return [
        { kind: "undo", row: previous },
        { kind: "redo", row: { ...previous, ...change.data } },
      ];
    }
  }
}

const needsServerCheck = ({ kind }: SummaryAdjustment) => kind === "create" || kind === "delete";

function adjustmentSign({ kind, row }: SummaryAdjustment, presentIds: Set<string>): 1 | -1 | 0 {
  switch (kind) {
    case "create":
      return presentIds.has(row.id) ? 0 : 1;
    case "delete":
      return presentIds.has(row.id) ? -1 : 0;
    case "undo":
      return -1;
    case "redo":
      return 1;
  }
}

export async function fetchSummaryWithPending(queryClient: QueryClient, range: DateRange): Promise<TransactionSummary> {
  const changes = pendingChanges(queryClient);
  const createdIds = new Set(changes.flatMap((change) => (change.kind === "create" ? [change.row.id] : [])));
  const adjustments = changes
    .flatMap((change) => toAdjustments(change, changes, createdIds))
    .filter(({ row }) => inRange(row.transactionDate, range));

  const { presentIds, ...summary } = await transactionService.getSummary(
    range,
    adjustments.filter(needsServerCheck).map(({ row }) => row.id),
  );
  const present = new Set(presentIds);

  return adjustments.reduce((current, adjustment) => {
    const sign = adjustmentSign(adjustment, present);
    return sign === 0 ? current : applyToSummary(current, adjustment.row, sign);
  }, summary);
}

export function pendingTransactionId(mutation: Mutation<unknown, unknown, unknown>) {
  const change = toPendingChange(mutation);
  return change?.kind === "create" ? change.row.id : change?.id;
}

export function mergeSyncStates(states: { id: string | undefined; state: OfflineSyncState | null }[]) {
  const byId = new Map<string, OfflineSyncState>();
  for (const { id, state } of states) {
    if (id && state && byId.get(id) !== "paused") byId.set(id, state);
  }
  return byId;
}
