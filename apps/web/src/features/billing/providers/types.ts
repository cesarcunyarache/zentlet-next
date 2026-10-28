import type { BillingInterval, PaymentStatus, ProviderName, SubscriptionStatus } from "../types";

export interface CheckoutInput {
  subscriptionId: string;
  reason: string;
  payerEmail: string;
  amount: number;
  currency: string;
  interval: BillingInterval;
  firstChargeAt: Date;
  returnUrl: string;
}

export interface CheckoutResult {
  externalId: string;
  checkoutUrl: string;
}

export interface SubscriptionSnapshot {
  externalId: string;
  reference: string | null;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
}

export interface PaymentSnapshot {
  externalId: string;
  subscriptionExternalId: string;
  providerPaymentId: string | null;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paidAt: Date | null;
}

export interface RefundInput {
  providerPaymentId: string;
  amount: number;
  idempotencyKey: string;
}

export type WebhookResource = "subscription" | "payment" | "ignored";

export interface WebhookNotification {
  eventId: string;
  type: string;
  resource: WebhookResource;
  resourceId: string;
}

export interface BillingProvider {
  readonly name: ProviderName;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  getSubscription(externalId: string): Promise<SubscriptionSnapshot>;
  getPayment(externalId: string): Promise<PaymentSnapshot>;
  cancelSubscription(externalId: string): Promise<void>;
  refundPayment(input: RefundInput): Promise<void>;
  parseWebhook(req: Request): Promise<WebhookNotification | null>;
}

export class BillingProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BillingProviderError";
  }
}
