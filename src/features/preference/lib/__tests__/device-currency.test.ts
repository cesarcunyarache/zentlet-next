import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../save", () => ({ savePreferences: vi.fn() }));

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void data.set(key, value)),
    removeItem: vi.fn((key: string) => void data.delete(key)),
    entries: () => Object.fromEntries(data),
  };
}

function brokenStorage() {
  const fail = () => {
    throw new Error("SecurityError");
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

let storage: ReturnType<typeof memoryStorage>;

// el módulo guarda la moneda en memoria: cada test lo carga de nuevo
async function load(initial?: Record<string, string>) {
  storage = memoryStorage(initial);
  vi.stubGlobal("localStorage", storage);
  vi.resetModules();
  const store = await import("../device-currency");
  const { savePreferences } = await import("../save");
  vi.mocked(savePreferences).mockResolvedValue(undefined);
  return { ...store, savePreferences: vi.mocked(savePreferences) };
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

  it("cada cuenta del dispositivo conserva la suya", async () => {
    const { getDeviceCurrency, setDeviceCurrency } = await load();
    setDeviceCurrency("user-1", "USD");
    setDeviceCurrency("user-2", "EUR");
    expect(getDeviceCurrency("user-1")).toBe("USD");
    expect(getDeviceCurrency("user-2")).toBe("EUR");
  });

  it("una cuenta sin moneda en este dispositivo no hereda la de otra", async () => {
    const { getDeviceCurrency, setDeviceCurrency } = await load();
    setDeviceCurrency("user-1", "USD");
    expect(getDeviceCurrency("user-2")).toBeNull();
  });

  it("se lee de la clave de su cuenta", async () => {
    const { getDeviceCurrency } = await load({ "zentlet.currency:user-1": "EUR" });
    expect(getDeviceCurrency("user-1")).toBe("EUR");
    expect(getDeviceCurrency("user-2")).toBeNull();
  });

  it("sólo lee el almacenamiento una vez por cuenta", async () => {
    const { getDeviceCurrency } = await load({ "zentlet.currency:user-1": "EUR" });
    getDeviceCurrency("user-1");
    getDeviceCurrency("user-1");
    expect(storage.getItem).toHaveBeenCalledTimes(1);
  });

  it("sin almacenamiento, la moneda vive en memoria", async () => {
    const { getDeviceCurrency, setDeviceCurrency } = await load();
    vi.stubGlobal("localStorage", brokenStorage());
    expect(getDeviceCurrency("user-1")).toBeNull();
    setDeviceCurrency("user-1", "USD");
    expect(getDeviceCurrency("user-1")).toBe("USD");
  });
});

describe("valores de versiones anteriores", () => {
  it("la cuenta dueña recupera el suyo", async () => {
    const { getDeviceCurrency } = await load({
      "zentlet.currency.v1": "EUR",
      "zentlet.currency.owner.v1": "user-1",
    });
    expect(getDeviceCurrency("user-1")).toBe("EUR");
    expect(getDeviceCurrency("user-2")).toBeNull();
  });

  it("uno sin dueño no lo hereda ninguna cuenta", async () => {
    const { getDeviceCurrency } = await load({ "zentlet.currency.v1": "EUR" });
    expect(getDeviceCurrency("user-1")).toBeNull();
  });

  it("al guardar, el de la cuenta pasa a su clave y el antiguo se borra", async () => {
    const { setDeviceCurrency } = await load({
      "zentlet.currency.v1": "EUR",
      "zentlet.currency.owner.v1": "user-1",
    });
    setDeviceCurrency("user-1", "EUR");
    expect(storage.entries()).toEqual({ "zentlet.currency:user-1": "EUR" });
  });

  it("al guardar, uno sin dueño se borra", async () => {
    const { setDeviceCurrency } = await load({ "zentlet.currency.v1": "EUR" });
    setDeviceCurrency("user-1", "USD");
    expect(storage.entries()).toEqual({ "zentlet.currency:user-1": "USD" });
  });

  it("el de otra cuenta se conserva hasta que esa cuenta entre", async () => {
    const { getDeviceCurrency, setDeviceCurrency } = await load({
      "zentlet.currency.v1": "EUR",
      "zentlet.currency.owner.v1": "user-1",
    });
    setDeviceCurrency("user-2", "USD");
    expect(getDeviceCurrency("user-1")).toBe("EUR");
  });
});

describe("avisos a la interfaz", () => {
  it("avisa cuando la moneda cambia, no cuando se repite", async () => {
    vi.stubGlobal("window", new EventTarget());
    const { setDeviceCurrency, subscribeDeviceCurrency } = await load();
    const listener = vi.fn();
    subscribeDeviceCurrency(listener);

    setDeviceCurrency("user-1", "USD");
    setDeviceCurrency("user-1", "USD");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("un cambio en otra pestaña se vuelve a leer", async () => {
    const target = new EventTarget();
    vi.stubGlobal("window", target);
    const { getDeviceCurrency, subscribeDeviceCurrency } = await load({ "zentlet.currency:user-1": "USD" });
    const listener = vi.fn();
    subscribeDeviceCurrency(listener);
    expect(getDeviceCurrency("user-1")).toBe("USD");

    storage.setItem("zentlet.currency:user-1", "EUR");
    target.dispatchEvent(Object.assign(new Event("storage"), { key: "zentlet.currency:user-1" }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getDeviceCurrency("user-1")).toBe("EUR");
  });

  it("ignora los cambios de otras claves", async () => {
    const target = new EventTarget();
    vi.stubGlobal("window", target);
    const { subscribeDeviceCurrency } = await load();
    const listener = vi.fn();
    subscribeDeviceCurrency(listener);

    target.dispatchEvent(Object.assign(new Event("storage"), { key: "zentlet-analytics-consent" }));
    expect(listener).not.toHaveBeenCalled();
  });

  it("deja de escuchar otras pestañas cuando nadie la usa", async () => {
    const target = new EventTarget();
    const remove = vi.spyOn(target, "removeEventListener");
    vi.stubGlobal("window", target);
    const { subscribeDeviceCurrency } = await load();

    const unsubscribe = subscribeDeviceCurrency(vi.fn());
    unsubscribe();
    expect(remove).toHaveBeenCalledWith("storage", expect.any(Function));
  });
});

describe("elegir la moneda", () => {
  it("se ve al instante y se guarda en la cuenta", async () => {
    const { changeCurrency, getDeviceCurrency, savePreferences } = await load();
    changeCurrency("user-1", "COP");
    expect(getDeviceCurrency("user-1")).toBe("COP");
    expect(savePreferences).toHaveBeenCalledWith("user-1", { currency: "COP" });
  });

  it("sin conexión se conserva en el dispositivo", async () => {
    const { changeCurrency, getDeviceCurrency, savePreferences } = await load();
    savePreferences.mockRejectedValue(new Error("Network Error"));
    changeCurrency("user-1", "COP");
    await Promise.resolve();
    expect(getDeviceCurrency("user-1")).toBe("COP");
  });
});
