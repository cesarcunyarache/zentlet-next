import type { Messages } from "next-intl";

/*
 * Avisos de sincronización para la UI. Las mutaciones ya no se esperan
 * (la UI no hace `await`), así que un rechazo del servidor que llega más
 * tarde (p. ej. una categoría borrada en otro dispositivo) se comunica por
 * aquí y la pantalla lo muestra como toast.
 */

/** Key de `offline.syncErrors`: la pantalla lo traduce al mostrarlo. */
export type SyncErrorKey = keyof Messages["offline"]["syncErrors"];

type Listener = (key: SyncErrorKey) => void;

const listeners = new Set<Listener>();

export function emitSyncError(key: SyncErrorKey) {
  listeners.forEach((listener) => listener(key));
}

export function onSyncError(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
