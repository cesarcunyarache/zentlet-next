/*
 * Avisos de sincronización para la UI. Las mutaciones ya no se esperan
 * (la UI no hace `await`), así que un rechazo del servidor que llega más
 * tarde (p. ej. una categoría borrada en otro dispositivo) se comunica por
 * aquí y la pantalla lo muestra como toast.
 */

type Listener = (message: string) => void;

const listeners = new Set<Listener>();

export function emitSyncError(message: string) {
  listeners.forEach((listener) => listener(message));
}

export function onSyncError(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
