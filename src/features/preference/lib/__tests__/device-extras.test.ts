import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../save", () => ({ savePreferences: vi.fn() }));

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void data.set(key, value)),
    removeItem: vi.fn((key: string) => void data.delete(key)),
  };
}

async function load(initial?: Record<string, string>) {
  vi.stubGlobal("localStorage", memoryStorage(initial));
  vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.resetModules();
  const store = await import("../device-extras");
  const { savePreferences } = await import("../save");
  vi.mocked(savePreferences).mockResolvedValue(undefined);
  return { ...store, savePreferences: vi.mocked(savePreferences) };
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe("extras del dispositivo", () => {
  it("sin nada guardado no hay extras", async () => {
    const t = await load();

    expect(t.getDeviceExtras("u1")).toEqual({});
  });

  it("lo guardado se recupera por usuario", async () => {
    const t = await load({ "zentlet.extras:u1": JSON.stringify({ hideBalance: true }) });

    expect(t.getDeviceExtras("u1")).toEqual({ hideBalance: true });
    expect(t.getDeviceExtras("u2")).toEqual({});
  });

  it("un valor guardado inválido se ignora", async () => {
    const t = await load({ "zentlet.extras:u1": "{no es json" });

    expect(t.getDeviceExtras("u1")).toEqual({});
  });

  it("cambiar un extra conserva los demás, avisa a los oyentes y lo envía a la cuenta", async () => {
    const t = await load();
    const listener = vi.fn();
    t.subscribeDeviceExtras(listener);
    t.changeExtras("u1", { hideBalance: true });

    t.changeExtras("u1", { feedPeriod: "month" });

    expect(t.getDeviceExtras("u1")).toEqual({ hideBalance: true, feedPeriod: "month" });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(t.savePreferences).toHaveBeenLastCalledWith("u1", { extras: { feedPeriod: "month" } });
  });

  it("si el almacenamiento falla igual funciona en memoria", async () => {
    const t = await load();
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
    });

    t.changeExtras("u1", { hideBalance: true });

    expect(t.getDeviceExtras("u1")).toEqual({ hideBalance: true });
  });
});
