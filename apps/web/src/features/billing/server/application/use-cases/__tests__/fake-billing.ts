import { vi } from "vitest";
import { createTestProvider } from "../../../../__tests__/test-provider";
import type { BillingProvider } from "../../../../providers/types";
import type { Payment, PaymentWithSubscription } from "../../../domain/entities/payment.entity";
import type { Subscription } from "../../../domain/entities/subscription.entity";
import type { BillingMonitor, BillingProviders, PlanCache, TestGrant } from "../../../domain/ports/billing.ports";
import type { BillingEventRepository } from "../../../domain/repositories/billing-event.repository";
import type { PaymentRepository } from "../../../domain/repositories/payment.repository";
import type { SubscriptionRepository } from "../../../domain/repositories/subscription.repository";
import { SubscriptionLifecycle } from "../../services/subscription-lifecycle.service";

export const NOW = new Date("2026-10-16T12:00:00Z");
export const DAY_MS = 24 * 60 * 60 * 1000;

export function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
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
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function payment(overrides: Partial<Payment> = {}, owner: Subscription = subscription()): PaymentWithSubscription {
  return {
    id: "pay-1",
    subscriptionId: owner.id,
    provider: "mercadopago",
    externalId: "charge-1",
    providerPaymentId: "mp-1",
    status: "approved",
    amount: 1490,
    refundedAmount: 0,
    currency: "PEN",
    paidAt: new Date(NOW.getTime() - 10 * DAY_MS),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
    subscription: owner,
  };
}

export function fakeBilling() {
  const provider = createTestProvider();
  provider.createCheckout.mockResolvedValue({ externalId: "pre-new", checkoutUrl: "https://pay.test/checkout" });
  provider.cancelSubscription.mockResolvedValue(undefined);
  provider.refundPayment.mockResolvedValue(undefined);

  const subscriptions: SubscriptionRepository = {
    findHistory: vi.fn().mockResolvedValue([]),
    findLive: vi.fn().mockResolvedValue(null),
    findByExternalId: vi.fn().mockResolvedValue(null),
    findByReference: vi.fn().mockResolvedValue(null),
    findDue: vi.fn().mockResolvedValue([]),
    createPending: vi.fn(async (draft) => subscription({ ...draft, id: "sub-new", status: "pending", externalId: null })),
    attachCheckout: vi.fn().mockResolvedValue(undefined),
    markAbandoned: vi.fn().mockResolvedValue(undefined),
    markCanceled: vi.fn().mockResolvedValue(undefined),
    applyProviderState: vi.fn(async (id, state) => subscription({ id, ...state })),
  };
  const payments: PaymentRepository = {
    findStatus: vi.fn().mockResolvedValue(null),
    findLatestStatus: vi.fn().mockResolvedValue(null),
    findWithSubscription: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue(undefined),
    recordRefund: vi.fn().mockResolvedValue("recorded"),
  };
  const events: BillingEventRepository = {
    record: vi.fn().mockResolvedValue(undefined),
    claimWebhook: vi.fn().mockResolvedValue({ id: "event-1", processedAt: null }),
    markProcessed: vi.fn().mockResolvedValue(undefined),
  };
  const providers: BillingProviders = {
    current: () => provider as unknown as BillingProvider,
    get: () => provider as unknown as BillingProvider,
    isKnown: (name) => name === provider.name,
  };
  const planCache: PlanCache = {
    get: vi.fn((_userId, load) => load()),
    forget: vi.fn().mockResolvedValue(undefined),
  };
  const testGrant: TestGrant = { isEnabled: () => false };
  const monitor: BillingMonitor = { warn: vi.fn(), failed: vi.fn() };
  const lifecycle = new SubscriptionLifecycle(subscriptions, payments, events, providers, planCache);

  return { provider, subscriptions, payments, events, providers, planCache, testGrant, monitor, lifecycle };
}
