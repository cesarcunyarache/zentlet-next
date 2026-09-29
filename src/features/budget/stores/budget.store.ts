"use client";

import { useMutation, useQuery, useQueryClient, type Mutation, type QueryClient } from "@tanstack/react-query";
import { getApiErrorStatus } from "@/core/services/api-error";
import { emitSyncError } from "@/core/offline/sync-events";
import {
  SYNC_SCOPE,
  isNotFound,
  mutationRetryDelay,
  reportSyncFailure,
  shouldRetryMutation,
} from "@/core/offline/sync-policy";
import { pendingMutations } from "@/core/offline/pending-changes";
import { budgetService, type CreateBudgetPayload } from "../services/budget.service";
import { todayISO, withLimit } from "../lib/period";
import { planBudgetSave, type BudgetInput } from "../lib/save-plan";
import type { TBudget } from "../types";

export const budgetKeys = {
  all: ["budgets"] as const,
};

export const budgetMutationKeys = {
  all: ["budgets", "mutation"] as const,
  create: ["budgets", "mutation", "create"] as const,
  limit: ["budgets", "mutation", "limit"] as const,
  remove: ["budgets", "mutation", "delete"] as const,
};

type LimitVariables = { budgetId: string; effectiveFrom: string; amount: number };

type BudgetErrorKey = "createBudget" | "updateBudget" | "deleteBudget";

function localBudget({ id, categoryId, kind, periodUnit, periodCount, startDate, amount }: CreateBudgetPayload): TBudget {
  return { id, categoryId, kind, periodUnit, periodCount, startDate, limits: [{ effectiveFrom: startDate, amount }] };
}

function applyLimit(rows: TBudget[], { budgetId, effectiveFrom, amount }: LimitVariables): TBudget[] {
  return rows.map((row) => (row.id === budgetId ? withLimit(row, { effectiveFrom, amount }) : row));
}

function applyMutation(rows: TBudget[], mutation: Mutation<unknown, unknown, unknown>): TBudget[] {
  const kind = mutation.options.mutationKey?.[2];
  const variables = mutation.state.variables;

  switch (kind) {
    case "create": {
      const created = localBudget(variables as CreateBudgetPayload);
      return rows.some((row) => row.id === created.id) ? rows : [...rows, created];
    }
    case "limit":
      return applyLimit(rows, variables as LimitVariables);
    case "delete":
      return rows.filter((row) => row.id !== variables);
    default:
      return rows;
  }
}

export async function fetchBudgetsWithPending(queryClient: QueryClient) {
  const rows = await budgetService.getBudgets();
  return pendingMutations(queryClient, budgetMutationKeys.all).reduce(applyMutation, rows);
}

function setList(queryClient: QueryClient, update: (rows: TBudget[]) => TBudget[]) {
  queryClient.setQueryData<TBudget[]>(budgetKeys.all, (current) => update(current ?? []));
}

function refreshWhenQueueDrains(queryClient: QueryClient) {
  if (queryClient.isMutating() <= 1) {
    return queryClient.invalidateQueries({ queryKey: budgetKeys.all });
  }
}

const HTTP_CONFLICT = 409;

function reportError(error: unknown, key: BudgetErrorKey) {
  const alreadyBudgeted = key === "createBudget" && getApiErrorStatus(error) === HTTP_CONFLICT;
  emitSyncError(alreadyBudgeted ? "budgetExists" : key);
  if (!alreadyBudgeted) reportSyncFailure(key, error);
}

export function registerBudgetMutations(queryClient: QueryClient) {
  const shared = {
    scope: SYNC_SCOPE,
    retry: shouldRetryMutation,
    retryDelay: mutationRetryDelay,
  };
  const cancelList = () => queryClient.cancelQueries({ queryKey: budgetKeys.all });
  const refetchList = () => void queryClient.invalidateQueries({ queryKey: budgetKeys.all });

  queryClient.setMutationDefaults(budgetMutationKeys.create, {
    ...shared,
    mutationFn: (variables: CreateBudgetPayload) => budgetService.createBudget(variables),
    onMutate: async (variables: CreateBudgetPayload) => {
      await cancelList();
      setList(queryClient, (rows) => [...rows.filter((row) => row.id !== variables.id), localBudget(variables)]);
    },
    onError: (error: unknown, variables: CreateBudgetPayload) => {
      setList(queryClient, (rows) => rows.filter((row) => row.id !== variables.id));
      reportError(error, "createBudget");
    },
    onSettled: () => refreshWhenQueueDrains(queryClient),
  });

  queryClient.setMutationDefaults(budgetMutationKeys.limit, {
    ...shared,
    mutationFn: ({ budgetId, effectiveFrom, amount }: LimitVariables) =>
      budgetService.setBudgetLimit(budgetId, effectiveFrom, amount),
    onMutate: async (variables: LimitVariables) => {
      await cancelList();
      setList(queryClient, (rows) => applyLimit(rows, variables));
    },
    onError: (error: unknown) => {
      refetchList();
      reportError(error, "updateBudget");
    },
    onSettled: () => refreshWhenQueueDrains(queryClient),
  });

  queryClient.setMutationDefaults(budgetMutationKeys.remove, {
    ...shared,
    mutationFn: async (budgetId: string) => {
      try {
        await budgetService.deleteBudget(budgetId);
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
    },
    onMutate: async (budgetId: string) => {
      await cancelList();
      setList(queryClient, (rows) => rows.filter((row) => row.id !== budgetId));
    },
    onError: (error: unknown) => {
      refetchList();
      reportError(error, "deleteBudget");
    },
    onSettled: () => refreshWhenQueueDrains(queryClient),
  });
}

export function useBudgetStore() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: budgetKeys.all,
    queryFn: () => fetchBudgetsWithPending(queryClient),
  });
  const create = useMutation<TBudget, unknown, CreateBudgetPayload>({ mutationKey: budgetMutationKeys.create });
  const limit = useMutation<TBudget, unknown, LimitVariables>({ mutationKey: budgetMutationKeys.limit });
  const remove = useMutation<void, unknown, string>({ mutationKey: budgetMutationKeys.remove });
  const budgets = query.data ?? [];

  function saveBudget(input: BudgetInput) {
    const existing = budgets.find((budget) => budget.categoryId === input.categoryId);
    const plan = planBudgetSave(existing, input, todayISO());
    if (plan.limit) limit.mutate(plan.limit);
    if (plan.remove) remove.mutate(plan.remove);
    if (plan.create) create.mutate({ id: crypto.randomUUID(), ...plan.create });
  }

  return {
    budgets,
    saveBudget,
    deleteBudget: (budgetId: string) => remove.mutate(budgetId),
  };
}
