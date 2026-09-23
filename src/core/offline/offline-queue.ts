import type { Mutation, QueryClient } from "@tanstack/react-query";

/*
 * Qué escrituras pasaron por la cola sin conexión.
 *
 * Un guardado normal con red también queda "pending" unos milisegundos;
 * sólo las que llegaron a pausarse (hechas sin red, o restauradas al abrir
 * la app) merecen avisar de que se están sincronizando al volver la red.
 */

const queuedOffline = new WeakSet<object>();

/**
 * Registrar antes de restaurar la cache: las mutaciones restauradas llegan
 * ya pausadas y así también cuentan.
 */
export function trackOfflineQueue(queryClient: QueryClient) {
  return queryClient.getMutationCache().subscribe((event) => {
    if (event.mutation?.state.isPaused) queuedOffline.add(event.mutation);
  });
}

export type OfflineSyncState = "paused" | "syncing";

/**
 * `paused` = guardada en el dispositivo, esperando red; `syncing` = pasó
 * por la cola y se está enviando ahora. `null` = guardado normal con red.
 */
export function offlineSyncState(mutation: Mutation<unknown, unknown, unknown>): OfflineSyncState | null {
  if (mutation.state.status !== "pending") return null;
  if (mutation.state.isPaused) return "paused";
  return queuedOffline.has(mutation) ? "syncing" : null;
}
