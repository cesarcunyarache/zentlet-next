import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/offline/offline-query-provider", () => ({ useOfflineSession: vi.fn() }));
vi.mock("../lib/save", () => ({ savePreferences: vi.fn() }));

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

// el módulo guarda la moneda en memoria: cada test lo carga de nuevo
async function load(initial?: Record<string, string>) {
  vi.stubGlobal("localStorage", memoryStorage(initial));
  vi.resetModules();
  return import("./useCurrency");
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("moneda del dispositivo", () => {
  it("la cuenta que la eligió la recupera", async () => {
    const { getDeviceCurrency, setDeviceCurrency } = await load();
    setDeviceCurrency("user-1", "USD");
    expect(getDeviceCurrency("user-1")).toBe("USD");
  });

  it("otra cuenta en el mismo dispositivo no la hereda", async () => {
    const { getDeviceCurrency, setDeviceCurrency } = await load();
    setDeviceCurrency("user-1", "USD");
    expect(getDeviceCurrency("user-2")).toBe("PEN");
  });

  it("se lee del almacenamiento con su dueño", async () => {
    const { getDeviceCurrency } = await load({ "zentlet.currency.v1": "EUR", "zentlet.currency.owner.v1": "user-1" });
    expect(getDeviceCurrency("user-1")).toBe("EUR");
    expect(getDeviceCurrency("user-2")).toBe("PEN");
  });

  it("un valor de versiones anteriores, sin dueño, se conserva", async () => {
    const { getDeviceCurrency } = await load({ "zentlet.currency.v1": "€" });
    expect(getDeviceCurrency("user-1")).toBe("EUR");
  });
});
