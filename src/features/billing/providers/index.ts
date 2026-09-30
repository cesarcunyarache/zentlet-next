import type { ProviderName } from "../types";
import { createMercadoPagoProvider } from "./mercadopago";
import type { BillingProvider } from "./types";

const PROVIDERS: Record<ProviderName, () => BillingProvider> = {
  mercadopago: createMercadoPagoProvider,
};

export function isProviderName(value: string): value is ProviderName {
  return Object.hasOwn(PROVIDERS, value);
}

export function getBillingProvider(name: string = process.env.BILLING_PROVIDER ?? "mercadopago"): BillingProvider {
  if (!isProviderName(name)) throw new Error(`Unknown billing provider: ${name}`);
  return PROVIDERS[name]();
}
