import { vi } from "vitest";
import type { BillingProvider } from "../providers/types";

export function createTestProvider() {
  return {
    name: "mercadopago",
    createCheckout: vi.fn(),
    getSubscription: vi.fn(),
    getPayment: vi.fn(),
    cancelSubscription: vi.fn(),
    refundPayment: vi.fn(),
    parseWebhook: vi.fn(),
  } satisfies Record<keyof BillingProvider, unknown>;
}

export type TestProvider = ReturnType<typeof createTestProvider>;

export function mockedProvidersModule() {
  const provider = createTestProvider();
  return {
    getBillingProvider: () => provider,
    isProviderName: (name: string) => name === provider.name,
  };
}

export const subscriptionRow = (overrides: Record<string, unknown> = {}) => ({
  id: "sub-1",
  userId: "user-1",
  planKey: "pro",
  status: "active",
  amount: 1490,
  currency: "PEN",
  interval: "month",
  provider: "mercadopago",
  externalId: "pre-1",
  checkoutUrl: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  canceledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
