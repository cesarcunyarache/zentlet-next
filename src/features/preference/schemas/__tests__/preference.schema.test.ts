import { describe, expect, it } from "vitest";
import { preferenceUpdateSchema, preferencesSchema } from "../preference.schema";

describe("preferenceUpdateSchema", () => {
  it("acepta cambios parciales", () => {
    expect(preferenceUpdateSchema.parse({ currency: "COP" })).toEqual({ currency: "COP" });
    expect(preferenceUpdateSchema.parse({ language: "en" })).toEqual({ language: "en" });
  });

  it("acepta ocultar el saldo y el periodo del feed dentro de extras", () => {
    expect(preferenceUpdateSchema.parse({ extras: { hideBalance: true } })).toEqual({ extras: { hideBalance: true } });
    expect(preferenceUpdateSchema.parse({ extras: { feedPeriod: "month" } })).toEqual({ extras: { feedPeriod: "month" } });
  });

  it("acepta marcar el tour de presupuestos como visto", () => {
    expect(preferenceUpdateSchema.parse({ extras: { budgetTourSeen: true } })).toEqual({ extras: { budgetTourSeen: true } });
  });

  it("rechaza un periodo de feed desconocido", () => {
    expect(preferenceUpdateSchema.safeParse({ extras: { feedPeriod: "year" } }).success).toBe(false);
  });

  it.each(["America/Lima", "Europe/Madrid", "UTC"])("acepta la zona horaria %s", (timezone) => {
    expect(preferenceUpdateSchema.safeParse({ timezone }).success).toBe(true);
  });

  it.each([
    { timezone: "" },
    { timezone: "Mars/Olympus" },
    { timezone: "x".repeat(65) },
    { currency: "usd" },
    { language: "pt" },
    { theme: "dark" },
    {},
  ])("rechaza %j", (body) => {
    expect(preferenceUpdateSchema.safeParse(body).success).toBe(false);
  });
});

describe("preferencesSchema", () => {
  it("conserva los valores válidos", () => {
    const row = { language: "en", currency: "USD", timezone: "Europe/Madrid", extras: {} };
    expect(preferencesSchema.parse(row)).toEqual(row);
  });

  it("al leer, un extra inválido se descarta sin perder los demás", () => {
    const row = { language: "es", currency: "PEN", timezone: "America/Lima", extras: { hideBalance: true, feedPeriod: "year" } };
    expect(preferencesSchema.parse(row).extras).toEqual({ hideBalance: true });
  });

  it("descarta claves de extras que ya no existen", () => {
    const row = { language: "es", currency: "PEN", timezone: "America/Lima", extras: { removed: true } };
    expect(preferencesSchema.parse(row).extras).toEqual({});
  });
});
