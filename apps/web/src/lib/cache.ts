import { withKeyValueStore } from "@/lib/kv";

/*
 * Caché de lecturas sobre el almacén clave-valor. Sin almacén (o caído)
 * cada llamada va directa a `load`: la caché acelera, nunca es la fuente
 * de verdad. Quien escribe el dato borra su clave con `invalidate`; el TTL
 * acota lo que dura un valor viejo si ese borrado no llegó.
 */

export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  const hit = await withKeyValueStore((store) => store.get(key));
  if (hit !== null) {
    try {
      return JSON.parse(hit) as T;
    } catch {
      // valor corrupto: se recalcula y se sobrescribe
    }
  }
  const value = await load();
  await withKeyValueStore((store) => store.set(key, JSON.stringify(value), ttlSeconds));
  return value;
}

export async function invalidate(...keys: string[]) {
  await withKeyValueStore((store) => store.delete(...keys));
}

/**
 * `true` la primera vez que se pide `key` dentro de la ventana, y también
 * sin almacén: sirve para no repetir una escritura cara, no para garantizar
 * que ocurra una sola vez.
 */
export async function isFirstWithin(key: string, ttlSeconds: number) {
  const claimed = await withKeyValueStore((store) => store.setIfAbsent(key, "1", ttlSeconds));
  return claimed !== false;
}
