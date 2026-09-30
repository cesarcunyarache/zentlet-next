import {
  BillingProviderError,
  type BillingProvider,
  type PaymentSnapshot,
  type RefundInput,
  type SubscriptionSnapshot,
  type WebhookNotification,
} from "@/features/billing/providers/types";
import type { PaymentStatus } from "@/features/billing/types";

interface RemoteSubscription extends SubscriptionSnapshot {
  firstChargeAt: Date;
  amount: number;
  currency: string;
}

const NETWORK_DELAY_MS = 25;
export const VALID_SIGNATURE = "valid";
export const SIGNATURE_HEADER = "x-test-signature";

const subscriptions = new Map<string, RemoteSubscription>();
const payments = new Map<string, PaymentSnapshot>();
const refunds: RefundInput[] = [];
let sequence = 0;
let failuresLeft = 0;

const nextId = (prefix: string) => `${prefix}-${++sequence}`;
const addMonth = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()));

function remote(externalId: string) {
  const subscription = subscriptions.get(externalId);
  if (!subscription) throw new BillingProviderError("Subscription not found", 404);
  return subscription;
}

export const gateway = {
  reset() {
    subscriptions.clear();
    payments.clear();
    refunds.length = 0;
    failuresLeft = 0;
  },
  failNextCheckout() {
    failuresLeft = 1;
  },
  subscriptions: () => [...subscriptions.values()],
  refunds: () => [...refunds],
  authorize(externalId: string) {
    const subscription = remote(externalId);
    subscription.status = "active";
    subscription.currentPeriodEnd = subscription.firstChargeAt;
  },
  cancel(externalId: string, paidUntil?: Date) {
    const subscription = remote(externalId);
    subscription.status = "canceled";
    if (paidUntil) subscription.currentPeriodEnd = paidUntil;
  },
  charge(externalId: string, status: PaymentStatus) {
    const subscription = remote(externalId);
    const paymentId = nextId("charge");
    const isApproved = status === "approved";
    payments.set(paymentId, {
      externalId: paymentId,
      subscriptionExternalId: externalId,
      providerPaymentId: nextId("payment"),
      status,
      amount: subscription.amount,
      currency: subscription.currency,
      paidAt: isApproved ? new Date() : null,
    });
    if (isApproved) subscription.currentPeriodEnd = addMonth(new Date());
    return paymentId;
  },
};

const fakeProvider: BillingProvider = {
  name: "mercadopago",

  async createCheckout(input) {
    await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));
    if (failuresLeft-- > 0) throw new BillingProviderError("Gateway unavailable", 503);
    const externalId = nextId("pre");
    subscriptions.set(externalId, {
      externalId,
      reference: input.subscriptionId,
      status: "pending",
      currentPeriodEnd: null,
      firstChargeAt: input.firstChargeAt,
      amount: input.amount,
      currency: input.currency,
    });
    return { externalId, checkoutUrl: `https://gateway.test/checkout/${externalId}` };
  },

  async getSubscription(externalId) {
    const { externalId: id, reference, status, currentPeriodEnd } = remote(externalId);
    return { externalId: id, reference, status, currentPeriodEnd };
  },

  async getPayment(externalId) {
    const payment = payments.get(externalId);
    if (!payment) throw new BillingProviderError("Payment not found", 404);
    return payment;
  },

  async cancelSubscription(externalId) {
    remote(externalId).status = "canceled";
  },

  async refundPayment(input) {
    refunds.push(input);
  },

  async parseWebhook(req) {
    if (req.headers.get(SIGNATURE_HEADER) !== VALID_SIGNATURE) return null;
    return (await req.json()) as WebhookNotification;
  },
};

export function fakeProvidersModule() {
  return {
    getBillingProvider: () => fakeProvider,
    isProviderName: (name: string) => name === fakeProvider.name,
  };
}
