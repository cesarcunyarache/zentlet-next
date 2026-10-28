import { describe, expect, it } from "vitest";
import { deleteAccountErrorKey, hasCredentialAccount } from "../delete-account";

describe("hasCredentialAccount", () => {
  it("detecta una cuenta con contraseña", () => {
    expect(hasCredentialAccount([{ providerId: "google" }, { providerId: "credential" }])).toBe(true);
  });

  it("sólo con proveedores sociales no hay contraseña", () => {
    expect(hasCredentialAccount([{ providerId: "google" }, { providerId: "github" }])).toBe(false);
  });

  it.each([null, undefined, []])("sin cuentas (%s) no hay contraseña", (accounts) => {
    expect(hasCredentialAccount(accounts)).toBe(false);
  });
});

describe("deleteAccountErrorKey", () => {
  it.each([
    ["INVALID_PASSWORD", "invalidPassword"],
    ["SESSION_EXPIRED", "sessionExpired"],
    ["OTHER", "fallback"],
    [undefined, "fallback"],
  ] as const)("%s → %s", (code, key) => {
    expect(deleteAccountErrorKey(code)).toBe(key);
  });
});
