import type { BillingEventSource } from './billing.types.js';
import type { Subscription } from './subscription.js';

export type BillingEventData = Record<string, string | number | boolean | null>;

export type NewBillingEvent = {
  source: BillingEventSource;
  type: string;
  userId?: string;
  subscriptionId?: string;
  data?: BillingEventData;
};

export type ClaimedWebhookEvent = {
  id: string;
  processedAt: Date | null;
};

export type WebhookEventOutcome =
  | { kind: 'ignored' }
  | { kind: 'unmatched' }
  | { kind: 'matched'; subscription: Pick<Subscription, 'id' | 'userId'> };
