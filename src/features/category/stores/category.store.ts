"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { categoryService } from "../services/category.service";
import type { TCategory, TCategoryPayload } from "../types";

/* ── query keys ────────────────────────────────────────────────────────
   Un único sitio donde viven las claves. `detail(id)` cuelga de `all`, así
   que invalidar `all` alcanza también a los detalles (match por prefijo). */

export const categoryKeys = {
  all: ["categories"] as const,
  detail: (categoryId: string) => ["categories", categoryId] as const,
};

/** Toda la cache de categorías queda obsoleta y se recarga si está en uso. */
function invalidateCategories(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: categoryKeys.all });
}

/* ── hooks de acceso ──────────────────────────────────────────────────── */

/** Lista de categorías del usuario. */
export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: () => categoryService.getCategories(),
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

/* ── mutaciones ───────────────────────────────────────────────────────── */

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TCategoryPayload) => categoryService.createCategory(data),
    // Sin optimistic update: el id y las fechas los genera el servidor.
    onSuccess: () => invalidateCategories(queryClient),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      data,
    }: {
      categoryId: string;
      data: Partial<TCategoryPayload>;
    }) => categoryService.updateCategory(categoryId, data),
    onSuccess: (category) => {
      // La respuesta ya trae la entidad actualizada: se siembra el detalle
      // para que no haya un refetch innecesario al abrirlo.
      queryClient.setQueryData(categoryKeys.detail(category.id), category);
      return invalidateCategories(queryClient);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: string) =>
      categoryService.deleteCategory(categoryId),

    /* Único optimistic update del módulo: borrar es la acción donde la
       espera se nota (la tarjeta se queda ahí mientras viaja la petición). */
    onMutate: async (categoryId) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });

      const previous = queryClient.getQueryData<TCategory[]>(categoryKeys.all);

      queryClient.setQueryData<TCategory[]>(categoryKeys.all, (current) =>
        current?.filter((category) => category.id !== categoryId),
      );

      return { previous };
    },
    onError: (_error, _categoryId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(categoryKeys.all, context.previous);
      }
    },
    onSettled: (_data, _error, categoryId) => {
      queryClient.removeQueries({ queryKey: categoryKeys.detail(categoryId) });
      return invalidateCategories(queryClient);
    },
  });
}

/* ── fachada ──────────────────────────────────────────────────────────── */

/**
 * Punto de entrada para los componentes: expone el server state de
 * categorías sin que la vista sepa nada de Axios ni de TanStack Query.
 *
 * Se llama `useCategoryStore` (y no `CategoryStore`) porque es un hook:
 * mantener el prefijo `use` es lo que permite a las reglas de hooks de
 * React y ESLint validar dónde se invoca.
 */
export function useCategoryStore() {
  const query = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();

  return {
    /** Nunca `undefined`: la vista puede iterar sin comprobar. */
    categories: query.data ?? [],

    // Estados de la query
    /** Primera carga, aún no hay datos en cache. */
    isLoading: query.isLoading,
    /** Hay datos en pantalla y se está recargando de fondo. */
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Acciones (devuelven promesa: se puede hacer await y capturar el error)
    createCategory: create.mutateAsync,
    updateCategory: update.mutateAsync,
    deleteCategory: remove.mutateAsync,

    // Estados de las mutaciones, separados del estado de la query
    isCreating: create.isPending,
    isUpdating: update.isPending,
    isDeleting: remove.isPending,
    createError: create.error,
    updateError: update.error,
    deleteError: remove.error,
  };
}
