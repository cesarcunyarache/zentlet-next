import { logger } from "@/lib/observability/logger";
import type { KeyValueStore } from "./types";

/*
 * Punto único de acceso al almacén clave-valor. Es opcional: sin
 * `REDIS_URL` no se carga ningún cliente y quien lo usa sigue con su
 * alternativa (Postgres o la consulta directa). Si el almacén falla, se deja
 * de usar durante COOLDOWN_MS: ninguna petición paga el timeout dos veces.
 */

const COOLDOWN_MS = 30_000;

const url = process.env.REDIS_URL;

export const isKeyValueStoreEnabled = Boolean(url);

let store: Promise<KeyValueStore> | null = null;
let unavailableUntil = 0;

function getStore() {
  store ??= import("./redis").then(({ createRedisStore }) => createRedisStore(url as string));
  return store;
}

/** Ejecuta `operation` en el almacén. `null` si no está configurado o no responde; nunca lanza. */
export async function withKeyValueStore<T>(operation: (store: KeyValueStore) => Promise<T>): Promise<T | null> {
  if (!isKeyValueStoreEnabled || Date.now() < unavailableUntil) return null;
  try {
    return await operation(await getStore());
  } catch (error) {
    unavailableUntil = Date.now() + COOLDOWN_MS;
    logger.warn({ err: error, retryInMs: COOLDOWN_MS }, "kv.unavailable");
    return null;
  }
}

/** Para el health check: `null` si no está configurado. Ignora la pausa tras un fallo. */
export async function pingKeyValueStore(): Promise<boolean | null> {
  if (!isKeyValueStoreEnabled) return null;
  await (await getStore()).ping();
  unavailableUntil = 0;
  return true;
}

export type { KeyValueStore } from "./types";
