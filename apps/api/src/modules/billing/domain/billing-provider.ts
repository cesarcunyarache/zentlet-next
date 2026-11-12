import type { BillingInterval, PaymentStatus, SubscriptionStatus } from './billing.types.js';

export type CheckoutInput = {
  subscriptionId: string;
  reason: string;
  payerEmail: string;
  amount: number;
  currency: string;
  interval: BillingInterval;
  firstChargeAt: Date;
  returnUrl: string;
};

export type CheckoutResult = {
  externalId: string;
  checkoutUrl: string;
};

export type SubscriptionSnapshot = {
  externalId: string;
  reference: string | null;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
};

export type PaymentSnapshot = {
  externalId: string;
  subscriptionExternalId: string;
  providerPaymentId: string | null;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paidAt: Date | null;
};

export type RefundInput = {
  providerPaymentId: string;
  amount: number;
  idempotencyKey: string;
};

export type WebhookResource = 'subscription' | 'payment' | 'ignored';

export type WebhookNotification = {
  eventId: string;
  type: string;
  resource: WebhookResource;
  resourceId: string;
};

// Transport-agnostic: whoever wires the HTTP route extracts these primitives
// from the raw request (headers, query string, body) before calling the port.
export type WebhookHeaders = {
  signature: string | null;
  requestId: string | null;
};

export type WebhookQuery = {
  dataId: string | null;
  type: string | null;
};

export type WebhookRequest = {
  rawBody: string;
  headers: WebhookHeaders;
  query: WebhookQuery;
};

export class BillingProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'BillingProviderError';
  }
}

export abstract class BillingProvider {
  abstract readonly name: string;
  abstract createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  abstract getSubscription(externalId: string): Promise<SubscriptionSnapshot>;
  abstract getPayment(externalId: string): Promise<PaymentSnapshot>;
  abstract cancelSubscription(externalId: string): Promise<void>;
  abstract refundPayment(input: RefundInput): Promise<void>;
  // Pure: verifies the signature and normalizes the payload. No I/O.
  abstract parseWebhook(request: WebhookRequest): WebhookNotification | null;
}
