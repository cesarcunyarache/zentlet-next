export const SUBSCRIPTION_STATUSES = ["pending", "trialing", "active", "past_due", "canceled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "approved", "failed", "refunded", "partially_refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type BillingInterval = "month" | "year";

export type ProviderName = "mercadopago";

export type BillingEventSource = "webhook" | "user" | "system" | "admin";

export interface AccessWindow {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

export interface BillingSummary {
  plan: string;
  features: string[];
  status: SubscriptionStatus | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  isTrialEligible: boolean;
  hasPendingCheckout: boolean;
  price: { amount: number; currency: string; interval: BillingInterval };
}
