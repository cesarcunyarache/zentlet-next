import type { BillingInterval, SubscriptionStatus } from "../../../types";

export interface Subscription {
  id: string;
  userId: string;
  planKey: string;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  interval: BillingInterval;
  provider: string;
  externalId: string | null;
  checkoutUrl: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewSubscription = Pick<
  Subscription,
  "userId" | "planKey" | "amount" | "currency" | "interval" | "provider" | "trialEndsAt"
>;

export type ProviderState = Pick<Subscription, "status" | "externalId" | "currentPeriodEnd" | "canceledAt">;

export interface Cancellation {
  canceledAt: Date;
  accessUntil: Date | null;
}

export interface DueSubscriptionsQuery {
  pendingCreatedBefore: Date;
  periodEndedBefore: Date;
  limit: number;
}

export const SUBSCRIPTION_HISTORY_LIMIT = 10;
