import type { BillingInterval } from '../../../domain/billing.types.js';

export type CreateCheckoutInput = {
  userId: string;
  planKey: string;
  payerEmail: string;
  // Price, already resolved by the caller (cents) — this module has no plan
  // catalog of its own, it only knows how to collect money for a given price.
  amount: number;
  currency: string;
  interval: BillingInterval;
  reason: string;
  returnUrl: string;
  trialDays?: number;
};
