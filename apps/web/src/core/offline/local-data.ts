import { del, keys } from "idb-keyval";

/*
 * Datos del usuario guardados en el dispositivo:
 * - la cache de TanStack Query (con la cola offline) en IndexedDB, una por
 *   usuario;
 * - las páginas que el service worker guarda para abrir la app sin red
 *   (el HTML de /admin lleva el id del usuario).
 */

const CACHE_KEY_PREFIX = "zentlet-cache:";

/** Mismo prefijo que `PAGES_CACHE` en public/sw.js. */
const PAGE_CACHE_PREFIX = "zentlet-pages";

export function storageKey(userId: string) {
  return `${CACHE_KEY_PREFIX}${userId}`;
}

/**
 * Sin estas páginas, /admin no puede abrirse sin conexión: hace falta pasar
 * por el servidor (y por su comprobación de sesión) para volver a entrar.
 */
export async function clearCachedPages() {
  if (typeof window === "undefined" || !("caches" in window)) return;
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name.startsWith(PAGE_CACHE_PREFIX)).map((name) => caches.delete(name)));
}

/**
 * Datos locales de otras cuentas que usaron este dispositivo. Sus cambios
 * sin sincronizar se pierden: sólo podrían enviarse con la sesión de su
 * dueño, que ya no está aquí.
 */
export async function clearOtherUsersData(userId: string) {
  const current = storageKey(userId);
  const stored = await keys();
  await Promise.all(
    stored
      .filter((key): key is string => typeof key === "string" && key.startsWith(CACHE_KEY_PREFIX) && key !== current)
      .map((key) => del(key)),
  );
}

const SEEN_PAGES_KEY = "zentlet-seen-pages";
const MAX_SEEN_PAGES = 5;

/**
 * Tiempo transcurrido, medido con el reloj del dispositivo, desde que se
 * vio por primera vez la página generada en `renderedAt` (reloj del
 * servidor, sólo como identificador). No se comparan los dos relojes: el
 * del dispositivo puede ir adelantado o atrasado. Una página recién
 * generada siempre da 0.
 */
export function elapsedSincePageFirstSeen(renderedAt: number): number {
  const now = Date.now();
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_PAGES_KEY) ?? "{}") as Record<string, number>;
    if (seen[renderedAt] !== undefined) return now - seen[renderedAt];

    const latest = Object.entries({ ...seen, [renderedAt]: now })
      .sort(([a], [b]) => Number(b) - Number(a))
      .slice(0, MAX_SEEN_PAGES);
    localStorage.setItem(SEEN_PAGES_KEY, JSON.stringify(Object.fromEntries(latest)));
    return 0;
  } catch {
    // sin almacenamiento (modo privado): no se puede medir, la página no caduca sola
    return 0;
  }
}
