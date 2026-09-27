import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountService } from "@/features/account/services/account.service";
import { addPendingPreferences, clearPendingPreferences, readPendingPreferences } from "./pending";
import { savePreferences } from "./save";

vi.mock("@/features/account/services/account.service", () => ({
  accountService: { updatePreferences: vi.fn() },
}));

const updatePreferences = vi.mocked(accountService.updatePreferences);

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    keys: () => [...data.keys()],
  };
}

let storage: ReturnType<typeof memoryStorage>;

beforeEach(() => {
  vi.resetAllMocks();
  storage = memoryStorage();
  vi.stubGlobal("localStorage", storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pendientes de preferencias", () => {
  it("sin nada guardado no hay pendientes", () => {
    expect(readPendingPreferences("user-1")).toEqual({});
  });

  it("acumula cambios y el último valor de cada campo gana", () => {
    addPendingPreferences("user-1", { currency: "USD" });
    addPendingPreferences("user-1", { language: "en" });
    addPendingPreferences("user-1", { currency: "EUR" });
    expect(readPendingPreferences("user-1")).toEqual({ currency: "EUR", language: "en" });
  });

  it("son de cada usuario", () => {
    addPendingPreferences("user-1", { currency: "USD" });
    expect(readPendingPreferences("user-2")).toEqual({});
  });

  it("quita lo confirmado y borra la clave cuando no queda nada", () => {
    addPendingPreferences("user-1", { currency: "USD", language: "en" });
    clearPendingPreferences("user-1", { currency: "USD" });
    expect(readPendingPreferences("user-1")).toEqual({ language: "en" });
    clearPendingPreferences("user-1", { language: "en" });
    expect(storage.keys()).toEqual([]);
  });

  it("conserva un cambio posterior al que se confirmó", () => {
    addPendingPreferences("user-1", { currency: "EUR" });
    clearPendingPreferences("user-1", { currency: "USD" });
    expect(readPendingPreferences("user-1")).toEqual({ currency: "EUR" });
  });

  it("ignora un valor guardado corrupto o inválido", () => {
    storage.setItem("zentlet.preferences.pending:user-1", "{");
    expect(readPendingPreferences("user-1")).toEqual({});
    storage.setItem("zentlet.preferences.pending:user-1", JSON.stringify({ currency: "BTC" }));
    expect(readPendingPreferences("user-1")).toEqual({});
  });

  it("sin almacenamiento disponible no falla", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => addPendingPreferences("user-1", { currency: "USD" })).not.toThrow();
    expect(readPendingPreferences("user-1")).toEqual({});
  });
});

describe("savePreferences", () => {
  it("confirmado por el servidor, no deja pendientes", async () => {
    updatePreferences.mockResolvedValue({} as never);
    await savePreferences("user-1", { currency: "USD" });
    expect(updatePreferences).toHaveBeenCalledWith({ currency: "USD" });
    expect(readPendingPreferences("user-1")).toEqual({});
  });

  it("sin conexión, queda pendiente y propaga el error", async () => {
    updatePreferences.mockRejectedValue(new Error("offline"));
    await expect(savePreferences("user-1", { currency: "USD" })).rejects.toThrow("offline");
    expect(readPendingPreferences("user-1")).toEqual({ currency: "USD" });
  });
});
