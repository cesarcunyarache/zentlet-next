/*
 * Límite de uso por clave con ventana fija, en memoria. Vive en cada
 * instancia del servidor: frena el abuso de un usuario, pero con N
 * instancias el tope real es N × limit. Para un tope global exacto se
 * cambia el almacenamiento (Postgres, Redis) manteniendo esta firma.
 */

interface Window {
  start: number;
  count: number;
}

/** Tope de claves en memoria: por encima se descartan las ventanas vencidas. */
const MAX_KEYS = 10_000;

const windows = new Map<string, Window>();

function pruneExpired(now: number, windowMs: number) {
  for (const [key, window] of windows) {
    if (now - window.start >= windowMs) windows.delete(key);
  }
  // si aun así no cabe, se empieza de cero antes que crecer sin límite
  if (windows.size >= MAX_KEYS) windows.clear();
}

/** Cuenta un uso de `key`. `count` es el número de usos en la ventana actual. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  let window = windows.get(key);

  if (!window || now - window.start >= windowMs) {
    if (windows.size >= MAX_KEYS) pruneExpired(now, windowMs);
    window = { start: now, count: 0 };
    windows.set(key, window);
  }

  window.count += 1;
  return { allowed: window.count <= limit, count: window.count };
}
