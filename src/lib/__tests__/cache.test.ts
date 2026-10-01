import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KeyValueStore } from "@/lib/kv";
import { cached, invalidate, isFirstWithin } from "../cache";

const store = {
  get: vi.fn(),
  set: vi.fn(),
  setIfAbsent: vi.fn(),
  delete: vi.fn(),
  increment: vi.fn(),
  ping: vi.fn(),
} satisfies KeyValueStore;

let available = true;

vi.mock("@/lib/kv", () => ({
  withKeyValueStore: async (operation: (s: KeyValueStore) => Promise<unknown>) =>
    available ? operation(store) : null,
}));

beforeEach(() => {
  vi.resetAllMocks();
  available = true;
});

describe("cached", () => {
  it("con el valor guardado no llama a load", async () => {
    store.get.mockResolvedValue(JSON.stringify({ plan: "pro" }));
    const load = vi.fn();
    expect(await cached("k", 60, load)).toEqual({ plan: "pro" });
    expect(load).not.toHaveBeenCalled();
  });

  it("sin valor llama a load y lo guarda con su TTL", async () => {
    store.get.mockResolvedValue(null);
    expect(await cached("k", 60, async () => "free")).toBe("free");
    expect(store.set).toHaveBeenCalledWith("k", JSON.stringify("free"), 60);
  });

  it("sin almacén siempre llama a load", async () => {
    available = false;
    const load = vi.fn().mockResolvedValue("free");
    await cached("k", 60, load);
    await cached("k", 60, load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("un valor corrupto se recalcula", async () => {
    store.get.mockResolvedValue("{no es json");
    expect(await cached("k", 60, async () => "free")).toBe("free");
  });
});

describe("invalidate", () => {
  it("borra las claves; sin almacén no falla", async () => {
    await invalidate("a", "b");
    expect(store.delete).toHaveBeenCalledWith("a", "b");
    available = false;
    await expect(invalidate("a")).resolves.toBeUndefined();
  });
});

describe("isFirstWithin", () => {
  it("true sólo la primera vez en la ventana", async () => {
    store.setIfAbsent.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await isFirstWithin("k", 3600)).toBe(true);
    expect(await isFirstWithin("k", 3600)).toBe(false);
  });

  it("sin almacén siempre true: la escritura se hace como antes", async () => {
    available = false;
    expect(await isFirstWithin("k", 3600)).toBe(true);
  });
});
