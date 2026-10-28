import type { Mutation, QueryClient, QueryKey } from "@tanstack/react-query";

/*
 * Cambios aún no confirmados por el servidor, aplicados sobre una lista.
 *
 * Cuando la lista se recarga del servidor mientras hay escrituras en cola
 * (al abrir la app con cambios hechos sin conexión, o entre dos envíos de
 * la cola), la respuesta todavía no los incluye. Sin esto, las filas
 * pendientes desaparecerían y volverían a aparecer al sincronizar.
 */

export type PendingChange<T> =
  | { kind: "create"; row: T }
  | { kind: "update"; id: string; data: Partial<T> }
  | { kind: "delete"; id: string };

export function applyPendingChanges<T extends { id: string }>(
  rows: T[],
  changes: PendingChange<T>[],
): T[] {
  return changes.reduce<T[]>((current, change) => {
    switch (change.kind) {
      case "create":
        return current.some((row) => row.id === change.row.id) ? current : [change.row, ...current];
      case "update":
        return current.map((row) => (row.id === change.id ? { ...row, ...change.data } : row));
      case "delete":
        return current.filter((row) => row.id !== change.id);
    }
  }, rows);
}

/** Mutaciones pendientes (en cola o en vuelo) bajo un prefijo de clave, en orden. */
export function pendingMutations(queryClient: QueryClient, mutationKey: QueryKey) {
  return queryClient.getMutationCache().findAll({ mutationKey, status: "pending" }) as Mutation<
    unknown,
    unknown,
    unknown
  >[];
}
