import { afterEach, describe, expect, it, vi } from "vitest";
import { isDoneOnDevice, markDoneOnDevice } from "./device-storage";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    items,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recorrido visto en el dispositivo", () => {
  it("se guarda por cuenta con la fecha en que se vio", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);

    expect(isDoneOnDevice("user-1")).toBe(false);
    markDoneOnDevice("user-1");

    expect(isDoneOnDevice("user-1")).toBe(true);
    expect(isDoneOnDevice("user-2")).toBe(false);
    expect(storage.items.get("zentlet-onboarding-done:user-1")).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("sin almacenamiento disponible cuenta como no visto y no falla", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });

    expect(isDoneOnDevice("user-1")).toBe(false);
    expect(() => markDoneOnDevice("user-1")).not.toThrow();
  });
});
