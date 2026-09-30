import type { BillingInterval } from "../types";

export const FEATURES = ["transactions", "dashboard", "categories", "ai", "budgets", "export"] as const;
export type Feature = (typeof FEATURES)[number];

export const TRIAL_DAYS = 15;

interface Price {
  amount: number;
  currency: string;
  interval: BillingInterval;
}

interface Plan {
  name: string;
  features: readonly Feature[];
  price: Price | null;
}

export const PLANS = {
  free: {
    name: "Free",
    features: ["transactions", "dashboard", "categories", "ai"],
    price: null,
  },
  pro: {
    name: "Pro",
    features: FEATURES,
    price: { amount: 1490, currency: "PEN", interval: "month" },
  },
} as const satisfies Record<string, Plan>;

export type PlanKey = keyof typeof PLANS;

export const DEFAULT_PLAN: PlanKey = "free";
export const PAID_PLAN_KEYS = ["pro"] as const satisfies readonly PlanKey[];
export type PaidPlanKey = (typeof PAID_PLAN_KEYS)[number];

export function isPlanKey(value: string): value is PlanKey {
  return Object.hasOwn(PLANS, value);
}

export function planPrice(plan: PaidPlanKey): Price {
  return PLANS[plan].price;
}

export function planFeatures(plan: PlanKey): readonly Feature[] {
  return PLANS[plan].features;
}
