import { AxiosError, type AxiosResponse } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import type { Preferences } from "../schemas/preference.schema";

vi.mock("@/features/account/services/account.service", () => ({
  accountService: { getPreferences: vi.fn(), updatePreferences: vi.fn() },
}));
vi.mock("@/lib/observability/client", () => ({ reportClientError: vi.fn() }));

const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const USER = "user-1";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

function serverRow(overrides: Partial<Preferences> = {}): Preferences {
  return { language: "es", currency: "PEN", timezone: TIMEZONE, extras: {}, ...overrides };
}

function httpError(status: number) {
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, { status } as AxiosResponse);
}

// los módulos guardan estado de la visita: cada test los carga de nuevo
async function load() {
  vi.stubGlobal("localStorage", memoryStorage());
  vi.resetModules();
  const sync = await import("./account-sync");
  const device = await import("./device-currency");
  const pending = await import("./pending");
  const { accountService } = await import("@/features/account/services/account.service");
  const { reportClientError } = await import("@/lib/observability/client");
  const getPreferences = vi.mocked(accountService.getPreferences);
  const updatePreferences = vi.mocked(accountService.updatePreferences);
  updatePreferences.mockImplementation(async (update) => serverRow(update));

  let locale: Locale = "es";
  const switchLanguage = vi.fn();
  const options = (cancelled = () => false) => ({
    userId: USER,
    currentLocale: () => locale,
    switchLanguage,
    cancelled,
  });

  return {
    ...sync,
    ...device,
    ...pending,
    getPreferences,
    updatePreferences,
    reportClientError: vi.mocked(reportClientError),
    switchLanguage,
    options,
    setLocale: (next: Locale) => (locale = next),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe("sincronizar al abrir la app", () => {
  it("sin fila en el servidor, la crea con lo que usa el dispositivo", async () => {
    const t = await load();
    t.setDeviceCurrency(USER, "USD");
    t.getPreferences.mockResolvedValue(null);

    await t.syncPreferences(t.options());

    expect(t.updatePreferences).toHaveBeenCalledWith({ language: "es", currency: "USD", timezone: TIMEZONE });
    expect(t.switchLanguage).not.toHaveBeenCalled();
  });

  it("sin fila ni moneda en el dispositivo, usa la de por defecto", async () => {
    const t = await load();
    t.getPreferences.mockResolvedValue(null);

    await t.syncPreferences(t.options());

    expect(t.updatePreferences).toHaveBeenCalledWith(expect.objectContaining({ currency: "PEN" }));
    expect(t.getDeviceCurrency(USER)).toBe("PEN");
  });

  it("con fila, la moneda y el idioma de la cuenta mandan", async () => {
    const t = await load();
    t.setDeviceCurrency(USER, "USD");
    t.getPreferences.mockResolvedValue(serverRow({ language: "en", currency: "EUR" }));

    await t.syncPreferences(t.options());

    expect(t.getDeviceCurrency(USER)).toBe("EUR");
    expect(t.switchLanguage).toHaveBeenCalledWith("en");
    expect(t.updatePreferences).not.toHaveBeenCalled();
  });

  it("con fila, sólo envía la zona horaria si cambió", async () => {
    const t = await load();
    t.getPreferences.mockResolvedValue(serverRow({ timezone: "Asia/Tokyo" }));

    await t.syncPreferences(t.options());

    expect(t.updatePreferences).toHaveBeenCalledWith({ timezone: TIMEZONE });
  });

  it("lo pendiente manda sobre el servidor y se reenvía", async () => {
    const t = await load();
    t.addPendingPreferences(USER, { currency: "COP" });
    t.getPreferences.mockResolvedValue(serverRow({ currency: "EUR" }));

    await t.syncPreferences(t.options());

    expect(t.getDeviceCurrency(USER)).toBe("COP");
    expect(t.updatePreferences).toHaveBeenCalledWith({ currency: "COP" });
    expect(t.readPendingPreferences(USER)).toEqual({});
  });

  it("la moneda elegida mientras responde el servidor manda sobre su respuesta", async () => {
    const t = await load();
    t.setDeviceCurrency(USER, "PEN");
    const response = deferred<Preferences | null>();
    t.getPreferences.mockReturnValue(response.promise);

    const sync = t.syncPreferences(t.options());
    // el cambio ya se confirmó: no queda como pendiente
    t.setDeviceCurrency(USER, "USD");
    response.resolve(serverRow({ currency: "EUR" }));
    await sync;

    expect(t.getDeviceCurrency(USER)).toBe("USD");
    expect(t.updatePreferences).toHaveBeenCalledWith({ currency: "USD" });
  });

  it("un pendiente confirmado mientras responde el servidor también cuenta", async () => {
    const t = await load();
    t.addPendingPreferences(USER, { language: "en" });
    const response = deferred<Preferences | null>();
    t.getPreferences.mockReturnValue(response.promise);

    const sync = t.syncPreferences(t.options());
    t.clearPendingPreferences(USER, { language: "en" });
    t.setLocale("en");
    response.resolve(serverRow({ language: "es" }));
    await sync;

    expect(t.switchLanguage).not.toHaveBeenCalled();
  });

  it("el idioma cambiado mientras responde el servidor no se revierte", async () => {
    const t = await load();
    const response = deferred<Preferences | null>();
    t.getPreferences.mockReturnValue(response.promise);

    const sync = t.syncPreferences(t.options());
    t.setLocale("en");
    response.resolve(serverRow({ language: "es" }));
    await sync;

    expect(t.switchLanguage).not.toHaveBeenCalled();
    expect(t.updatePreferences).toHaveBeenCalledWith({ language: "en" });
  });

  it("si se desmontó mientras esperaba, no toca nada", async () => {
    const t = await load();
    t.setDeviceCurrency(USER, "USD");
    t.getPreferences.mockResolvedValue(serverRow({ language: "en", currency: "EUR" }));

    await t.syncPreferences(t.options(() => true));

    expect(t.getDeviceCurrency(USER)).toBe("USD");
    expect(t.switchLanguage).not.toHaveBeenCalled();
    expect(t.updatePreferences).not.toHaveBeenCalled();
  });
});

describe("volver a sincronizar en la misma visita", () => {
  it("después de sincronizar, sólo reenvía lo pendiente", async () => {
    const t = await load();
    t.getPreferences.mockResolvedValue(serverRow());
    await t.runPreferenceSync(t.options());

    t.addPendingPreferences(USER, { currency: "USD" });
    await t.runPreferenceSync(t.options());

    expect(t.getPreferences).toHaveBeenCalledTimes(1);
    expect(t.updatePreferences).toHaveBeenCalledWith({ currency: "USD" });
  });

  it("sin nada pendiente, no llama al servidor", async () => {
    const t = await load();
    t.getPreferences.mockResolvedValue(serverRow());
    await t.runPreferenceSync(t.options());
    await t.runPreferenceSync(t.options());

    expect(t.getPreferences).toHaveBeenCalledTimes(1);
    expect(t.updatePreferences).not.toHaveBeenCalled();
  });

  it("si la primera lectura falló, la repite", async () => {
    const t = await load();
    t.getPreferences.mockRejectedValueOnce(new AxiosError("Network Error")).mockResolvedValue(serverRow());

    await t.runPreferenceSync(t.options());
    await t.runPreferenceSync(t.options());

    expect(t.getPreferences).toHaveBeenCalledTimes(2);
  });
});

describe("errores", () => {
  it("sin red no se reporta: se reintenta más tarde", async () => {
    const t = await load();
    t.getPreferences.mockRejectedValue(new AxiosError("Network Error"));
    await t.runPreferenceSync(t.options());
    expect(t.reportClientError).not.toHaveBeenCalled();
  });

  it("con la sesión caducada no se reporta", async () => {
    const t = await load();
    t.getPreferences.mockRejectedValue(httpError(401));
    await t.runPreferenceSync(t.options());
    expect(t.reportClientError).not.toHaveBeenCalled();
  });

  it("un fallo del servidor se reporta sin el contenido de la petición", async () => {
    const t = await load();
    t.getPreferences.mockRejectedValue(httpError(500));
    await t.runPreferenceSync(t.options());

    const [reported] = t.reportClientError.mock.calls[0];
    expect(reported).not.toBeInstanceOf(AxiosError);
    expect(reported).toMatchObject({ name: "PreferenceSyncError", message: "Preference sync failed (500)" });
  });

  it("un fallo al reenviar lo pendiente también se reporta", async () => {
    const t = await load();
    t.getPreferences.mockResolvedValue(serverRow());
    await t.runPreferenceSync(t.options());

    t.addPendingPreferences(USER, { currency: "USD" });
    t.updatePreferences.mockRejectedValue(httpError(503));
    await t.runPreferenceSync(t.options());

    expect(t.reportClientError).toHaveBeenCalledTimes(1);
    expect(t.readPendingPreferences(USER)).toEqual({ currency: "USD" });
  });
});
