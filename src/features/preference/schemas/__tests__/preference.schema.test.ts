import { describe, expect, it } from "vitest";
import { preferenceUpdateSchema, preferencesSchema } from "../preference.schema";

describe("preferenceUpdateSchema", () => {
  it("acepta cambios parciales", () => {
    expect(preferenceUpdateSchema.parse({ currency: "COP" })).toEqual({ currency: "COP" });
    expect(preferenceUpdateSchema.parse({ language: "en" })).toEqual({ language: "en" });
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

  it("descarta claves de extras que ya no existen", () => {
    const row = { language: "es", currency: "PEN", timezone: "America/Lima", extras: { removed: true } };
    expect(preferencesSchema.parse(row).extras).toEqual({});
  });
});
