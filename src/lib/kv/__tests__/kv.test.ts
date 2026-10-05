import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KeyValueStore } from "../types";

const store = {
  get: vi.fn(),
  set: vi.fn(),
  setIfAbsent: vi.fn(),
  delete: vi.fn(),
  increment: vi.fn(),
  ping: vi.fn(),
} satisfies KeyValueStore;

const createRedisStore = vi.fn(() => store);

vi.mock("../redis", () => ({ createRedisStore }));
vi.mock("@/lib/observability/logger", () => ({ logger: { warn: vi.fn() } }));

async function loadKv(url: string) {
  vi.stubEnv("REDIS_URL", url);
  vi.resetModules();
  return import("..");
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("withKeyValueStore", () => {
  it("sin REDIS_URL devuelve null y no carga el cliente", async () => {
    const kv = await loadKv("");
    expect(kv.isKeyValueStoreEnabled).toBe(false);
    expect(await kv.withKeyValueStore((s) => s.get("k"))).toBeNull();
    expect(createRedisStore).not.toHaveBeenCalled();
  });

  it("configurado, devuelve el resultado del almacén", async () => {
    const kv = await loadKv("redis://localhost:6379");
    store.get.mockResolvedValue("valor");
    expect(await kv.withKeyValueStore((s) => s.get("k"))).toBe("valor");
    expect(createRedisStore).toHaveBeenCalledWith("redis://localhost:6379");
  });

  it("si el almacén falla devuelve null, no lanza, y lo deja de usar durante la pausa", async () => {
    const kv = await loadKv("redis://localhost:6379");
    store.get.mockRejectedValue(new Error("ECONNREFUSED"));

    expect(await kv.withKeyValueStore((s) => s.get("k"))).toBeNull();
    expect(await kv.withKeyValueStore((s) => s.get("k"))).toBeNull();
    expect(store.get).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_001);
    store.get.mockResolvedValue("de vuelta");
    expect(await kv.withKeyValueStore((s) => s.get("k"))).toBe("de vuelta");
  });

  it("el health check distingue sin configurar de conectado", async () => {
    expect(await (await loadKv("")).pingKeyValueStore()).toBeNull();
    store.ping.mockResolvedValue(undefined);
    expect(await (await loadKv("redis://localhost:6379")).pingKeyValueStore()).toBe(true);
  });
});
