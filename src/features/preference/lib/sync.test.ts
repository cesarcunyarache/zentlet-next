import { describe, expect, it } from "vitest";
import { planPreferenceSync, type DevicePreferences } from "./sync";

const device: DevicePreferences = { language: "en", currency: "USD", timezone: "America/Bogota" };
const server = { language: "es", currency: "EUR", timezone: "America/Bogota", extras: {} } as const;

describe("planPreferenceSync", () => {
  it("sin preferencias en el servidor, las crea con las del dispositivo", () => {
    expect(planPreferenceSync(null, device)).toEqual({ currency: "USD", update: device });
  });

  it("con preferencias en el servidor, la moneda de la cuenta manda", () => {
    expect(planPreferenceSync(server, device)).toEqual({ currency: "EUR", update: null });
  });

  it("si el dispositivo cambió de zona horaria, la actualiza", () => {
    expect(planPreferenceSync({ ...server, timezone: "America/Lima" }, device)).toEqual({
      currency: "EUR",
      update: { timezone: "America/Bogota" },
    });
  });

  it("no cambia el idioma de la cuenta por el de la URL", () => {
    expect(planPreferenceSync(server, device).update).toBeNull();
  });

  it("un cambio pendiente manda sobre la cuenta y se reenvía", () => {
    expect(planPreferenceSync(server, device, { currency: "USD", language: "en" })).toEqual({
      currency: "USD",
      update: { currency: "USD", language: "en" },
    });
  });

  it("reenvía los pendientes junto con la zona horaria", () => {
    expect(planPreferenceSync({ ...server, timezone: "America/Lima" }, device, { language: "en" })).toEqual({
      currency: "EUR",
      update: { language: "en", timezone: "America/Bogota" },
    });
  });

  it("sin fila en el servidor, los pendientes completan las del dispositivo", () => {
    expect(planPreferenceSync(null, { ...device, currency: "PEN" }, { currency: "COP" })).toEqual({
      currency: "COP",
      update: { ...device, currency: "COP" },
    });
  });
});
