import Redis from "ioredis";
import type { KeyValueStore } from "./types";

/*
 * Adaptador de Redis: el único archivo que importa el cliente. Falla rápido
 * (sin cola offline ni reintentos por comando): quien lo usa decide qué
 * hacer si Redis no responde, en vez de quedarse esperando.
 */

const CONNECT_TIMEOUT_MS = 1_000;
const COMMAND_TIMEOUT_MS = 500;

const INCREMENT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
return count`;

export function createRedisStore(url: string): KeyValueStore {
  const client = new Redis(url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 0,
    connectTimeout: CONNECT_TIMEOUT_MS,
    commandTimeout: COMMAND_TIMEOUT_MS,
  });
  // los fallos llegan a cada comando; sin este listener Node los trataría como no manejados
  client.on("error", () => {});

  let connecting: Promise<void> | null = null;
  const ready = () => {
    if (client.status === "ready") return Promise.resolve();
    connecting ??= client.connect().finally(() => {
      connecting = null;
    });
    return connecting;
  };

  return {
    async get(key) {
      await ready();
      return client.get(key);
    },
    async set(key, value, ttlSeconds) {
      await ready();
      await client.set(key, value, "EX", ttlSeconds);
    },
    async setIfAbsent(key, value, ttlSeconds) {
      await ready();
      return (await client.set(key, value, "EX", ttlSeconds, "NX")) === "OK";
    },
    async delete(...keys) {
      if (!keys.length) return;
      await ready();
      await client.del(...keys);
    },
    async increment(key, windowMs) {
      await ready();
      return Number(await client.eval(INCREMENT_SCRIPT, 1, key, windowMs));
    },
    async ping() {
      await ready();
      await client.ping();
    },
  };
}
