"use client";

import {
  useMutation,
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
import { categoryService } from "../services/category.service";
import type { TCategory, TCategoryPayload } from "../types";

/* ── claves ────────────────────────────────────────────────────────────
   `detail(id)` cuelga de `all`, así que invalidar `all` alcanza también a
   los detalles (match por prefijo). Las mutaciones tienen clave para poder
   restaurarse tras recargar (ver `registerCategoryMutations`). */

export const categoryKeys = {
  all: ["categories"] as const,
  detail: (categoryId: string) => ["categories", categoryId] as const,
};

export const categoryMutationKeys = {
  all: ["categories", "mutation"] as const,
  create: ["categories", "mutation", "create"] as const,
  update: ["categories", "mutation", "update"] as const,
  remove: ["categories", "mutation", "delete"] as const,
};

type CreateVariables = TCategoryPayload & { id: string };
type UpdateVariables = { categoryId: string; data: Partial<TCategoryPayload> };

/* ── cambios pendientes ────────────────────────────────────────────────── */

/** Forma completa de una categoría que aún no ha llegado al servidor. */
function localCategory({ id, name, icon, color, description }: CreateVariables): TCategory {
  const now = new Date().toISOString();
  return { id, name, icon, color, description: description ?? null, userId: "", createdAt: now, updatedAt: now };
}

function toPendingChange(mutation: Mutation<unknown, unknown, unknown>): PendingChange<TCategory> | null {
  const kind = mutation.options.mutationKey?.[2];
  const variables = mutation.state.variables;
  if (kind === "create") return { kind: "create", row: localCategory(variables as CreateVariables) };
  if (kind === "update") {
    const { categoryId, data } = variables as UpdateVariables;
    return { kind: "update", id: categoryId, data };
  }
  if (kind === "delete") return { kind: "delete", id: variables as string };
  return null;
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

/** Recarga cuando la cola queda vacía, no tras cada envío. */
function refreshWhenQueueDrains(queryClient: QueryClient) {
  if (queryClient.isMutating() <= 1) {
    return queryClient.invalidateQueries({ queryKey: categoryKeys.all });
  }
}

function reportError(error: unknown, fallback: string) {
  emitSyncError(getApiErrorMessage(error, fallback));
}

/* ── registro (antes de restaurar la cache persistida) ─────────────────── */

export function registerCategoryMutations(queryClient: QueryClient) {
  const shared = {
    scope: SYNC_SCOPE,
    retry: shouldRetryMutation,
    retryDelay: mutationRetryDelay,
  };

  queryClient.setMutationDefaults(categoryMutationKeys.create, {
    ...shared,
    mutationFn: (variables: CreateVariables) => categoryService.createCategory(variables),
    onMutate: async (variables: CreateVariables) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });
      setList(queryClient, (rows) => [localCategory(variables), ...rows.filter((row) => row.id !== variables.id)]);
    },
    onError: (error: unknown, variables: CreateVariables) => {
      setList(queryClient, (rows) => rows.filter((row) => row.id !== variables.id));
      reportError(error, "No se pudo crear la categoría");
    },
    onSettled: () => refreshWhenQueueDrains(queryClient),
  });

  queryClient.setMutationDefaults(categoryMutationKeys.update, {
    ...shared,
    mutationFn: ({ categoryId, data }: UpdateVariables) => categoryService.updateCategory(categoryId, data),
    onMutate: async ({ categoryId, data }: UpdateVariables) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });
      setList(queryClient, (rows) => rows.map((row) => (row.id === categoryId ? { ...row, ...data } : row)));
    },
    onSuccess: (category: TCategory) => {
      // la respuesta ya trae la entidad: el detalle no necesita refetch
      queryClient.setQueryData(categoryKeys.detail(category.id), category);
    },
    onError: (error: unknown) => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      reportError(error, "No se pudo guardar la categoría");
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
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });
      setList(queryClient, (rows) => rows.filter((row) => row.id !== categoryId));
    },
    onError: (error: unknown) => {
      // p. ej. 409: tiene movimientos. La categoría vuelve a la lista.
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      reportError(error, "No se pudo eliminar la categoría");
    },
    onSettled: (_data: unknown, _error: unknown, categoryId: string) => {
      queryClient.removeQueries({ queryKey: categoryKeys.detail(categoryId) });
      return refreshWhenQueueDrains(queryClient);
    },
  });
}

/* ── hooks de acceso ──────────────────────────────────────────────────── */

/** Lista de categorías del usuario, con las altas aún no sincronizadas. */
export function useCategories() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: async () => withPendingChanges(queryClient, await categoryService.getCategories()),
  });
}

/** Detalle de una categoría. Se desactiva si aún no hay id. */
export function useCategory(categoryId: string | null | undefined) {
  return useQuery({
    queryKey: categoryKeys.detail(categoryId ?? ""),
    queryFn: () => categoryService.getCategory(categoryId as string),
    enabled: Boolean(categoryId),
  });
}

/* ── fachada ──────────────────────────────────────────────────────────── */

/**
 * Punto de entrada para los componentes: expone el server state de
 * categorías sin que la vista sepa nada de Axios ni de TanStack Query.
 * Las escrituras no se esperan: el cambio es local al instante y se
 * sincroniza por detrás; un rechazo posterior llega por `onSyncError`.
 *
 * Se llama `useCategoryStore` (y no `CategoryStore`) porque es un hook:
 * mantener el prefijo `use` es lo que permite a las reglas de hooks de
 * React y ESLint validar dónde se invoca.
 */
export function useCategoryStore() {
  const query = useCategories();
  const create = useMutation<TCategory, unknown, CreateVariables>({
    mutationKey: categoryMutationKeys.create,
  });
  const update = useMutation<TCategory, unknown, UpdateVariables>({
    mutationKey: categoryMutationKeys.update,
  });
  const remove = useMutation<void, unknown, string>({
    mutationKey: categoryMutationKeys.remove,
  });

  return {
    /** Nunca `undefined`: la vista puede iterar sin comprobar. */
    categories: query.data ?? [],

    /** Primera carga sin nada en cache (ni en memoria ni en el dispositivo). */
    isLoading: query.isLoading,
    /** Hay datos en pantalla y se está recargando de fondo. */
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    /** Devuelve el id asignado, sin esperar al servidor. */
    createCategory: (payload: TCategoryPayload): string => {
      const id = crypto.randomUUID();
      create.mutate({ ...payload, id });
      return id;
    },
    updateCategory: (categoryId: string, data: Partial<TCategoryPayload>) =>
      update.mutate({ categoryId, data }),
    deleteCategory: (categoryId: string) => remove.mutate(categoryId),
  };
}
