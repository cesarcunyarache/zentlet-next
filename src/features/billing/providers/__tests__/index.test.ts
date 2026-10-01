import { afterEach, describe, expect, it, vi } from "vitest";
import { getBillingProvider, isProviderName } from "../index";

afterEach(() => vi.unstubAllEnvs());

describe("getBillingProvider", () => {
  it("usa BILLING_PROVIDER y, sin ella, Mercado Pago", () => {
    vi.stubEnv("BILLING_PROVIDER", "");
    expect(getBillingProvider(undefined).name).toBe("mercadopago");
    expect(getBillingProvider("mercadopago").name).toBe("mercadopago");
  });

  it("un proveedor desconocido falla en vez de caer en otro", () => {
    expect(() => getBillingProvider("paypal")).toThrow("Unknown billing provider");
    expect(isProviderName("paypal")).toBe(false);
    expect(isProviderName("mercadopago")).toBe(true);
  });
});
