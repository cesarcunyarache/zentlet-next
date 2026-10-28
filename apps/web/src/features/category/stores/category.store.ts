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
import { applyPendingChanges, pendingMutations, type PendingChange } from "@/core/offline/pending-changes";
import { categoryService } from "../services/category.service";
import type { TCategory, TCategoryPayload } from "../types";

export const categoryKeys = {
  all: ["categories"] as const,
};

export const categoryMutationKeys = {
  all: ["categories", "mutation"] as const,
  create: ["categories", "mutation", "create"] as const,
  update: ["categories", "mutation", "update"] as const,
  remove: ["categories", "mutation", "delete"] as const,
};

type CreateVariables = TCategoryPayload & { id: string };
type UpdateVariables = { categoryId: string; data: Partial<TCategoryPayload> };

type CategoryErrorKey = "createCategory" | "updateCategory" | "deleteCategory";

const HTTP_CONFLICT = 409;

function localCategory({ id, name, icon, color, description, aiSuggestions }: CreateVariables): TCategory {
  const now = new Date().toISOString();
  return {
    id,
    name,
    icon,
    color,
    description: description ?? null,
    aiSuggestions: aiSuggestions ?? null,
    userId: "",
    createdAt: now,
    updatedAt: now,
  };
}

function toPendingChange(mutation: Mutation<unknown, unknown, unknown>): PendingChange<TCategory> | null {
  const kind = mutation.options.mutationKey?.[2];
  const variables = mutation.state.variables;

  switch (kind) {
    case "create":
      return { kind: "create", row: localCategory(variables as CreateVariables) };
    case "update": {
      const { categoryId, data } = variables as UpdateVariables;
      return { kind: "update", id: categoryId, data };
    }
    case "delete":
      return { kind: "delete", id: variables as string };
    default:
      return null;
  }
}

function withPendingChanges(queryClient: QueryClient, rows: TCategory[]) {
  const changes = pendingMutations(queryClient, categoryMutationKeys.all)
    .map(toPendingChange)
    .filter((change) => change !== null);
  return applyPendingChanges(rows, changes);
}

function setList(queryClient: QueryClient, update: (rows: TCategory[]) => TCategory[]) {
  queryClient.setQueryData<TCategory[]>(categoryKeys.all, (current) => update(current ?? []));
}

function refreshWhenQueueDrains(queryClient: QueryClient) {
  if (queryClient.isMutating() <= 1) {
    return queryClient.invalidateQueries({ queryKey: categoryKeys.all });
  }
}

function reportError(error: unknown, key: CategoryErrorKey) {
  const isInUse = key === "deleteCategory" && getApiErrorStatus(error) === HTTP_CONFLICT;
  emitSyncError(isInUse ? "categoryInUse" : key);
  if (!isInUse) reportSyncFailure(key, error);
}

export function registerCategoryMutations(queryClient: QueryClient) {
  const shared = { scope: SYNC_SCOPE, retry: shouldRetryMutation, retryDelay: mutationRetryDelay };
  const cancelList = () => queryClient.cancelQueries({ queryKey: categoryKeys.all });
  const refetchList = () => void queryClient.invalidateQueries({ queryKey: categoryKeys.all });

  queryClient.setMutationDefaults(categoryMutationKeys.create, {
    ...shared,
    mutationFn: (variables: CreateVariables) => categoryService.createCategory(variables),
    onMutate: async (variables: CreateVariables) => {
      await cancelList();
      setList(queryClient, (rows) => [localCategory(variables), ...rows.filter((row) => row.id !== variables.id)]);
    },
    onError: (error: unknown, variables: CreateVariables) => {
      setList(queryClient, (rows) => rows.filter((row) => row.id !== variables.id));
      reportError(error, "createCategory");
    },
    onSettled: () => refreshWhenQueueDrains(queryClient),
  });

  queryClient.setMutationDefaults(categoryMutationKeys.update, {
    ...shared,
    mutationFn: ({ categoryId, data }: UpdateVariables) => categoryService.updateCategory(categoryId, data),
    onMutate: async ({ categoryId, data }: UpdateVariables) => {
      await cancelList();
      setList(queryClient, (rows) => rows.map((row) => (row.id === categoryId ? { ...row, ...data } : row)));
    },
    onError: (error: unknown) => {
      refetchList();
      reportError(error, "updateCategory");
    },
    onSettled: () => refreshWhenQueueDrains(queryClient),
  });

  queryClient.setMutationDefaults(categoryMutationKeys.remove, {
    ...shared,
    mutationFn: async (categoryId: string) => {
      try {
        await categoryService.deleteCategory(categoryId);
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
    },
    onMutate: async (categoryId: string) => {
      await cancelList();
      setList(queryClient, (rows) => rows.filter((row) => row.id !== categoryId));
    },
    onError: (error: unknown) => {
      refetchList();
      reportError(error, "deleteCategory");
    },
    onSettled: () => refreshWhenQueueDrains(queryClient),
  });
}

export function useCategoryStore() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: categoryKeys.all,
    queryFn: async () => withPendingChanges(queryClient, await categoryService.getCategories()),
  });
  const create = useMutation<TCategory, unknown, CreateVariables>({ mutationKey: categoryMutationKeys.create });
  const update = useMutation<TCategory, unknown, UpdateVariables>({ mutationKey: categoryMutationKeys.update });

  return {
    categories: query.data ?? [],
    isLoading: query.isLoading,
    createCategory: (payload: TCategoryPayload) => create.mutate({ ...payload, id: crypto.randomUUID() }),
    updateCategory: (categoryId: string, data: Partial<TCategoryPayload>) => update.mutate({ categoryId, data }),
  };
}
