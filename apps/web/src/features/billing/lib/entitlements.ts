import type { AccessWindow } from "../types";
import { DEFAULT_PLAN, isPlanKey, planFeatures, type Feature, type PlanKey } from "./plans";

const DAY_MS = 24 * 60 * 60 * 1000;
export const PAST_DUE_GRACE_DAYS = 10;

const isBefore = (now: Date, limit: Date | null, extraMs = 0) =>
  limit !== null && now.getTime() < limit.getTime() + extraMs;

export function grantsAccess(subscription: AccessWindow, now: Date) {
  switch (subscription.status) {
    case "active":
      return true;
    case "trialing":
      return isBefore(now, subscription.trialEndsAt);
    case "past_due":
      return isBefore(now, subscription.currentPeriodEnd, PAST_DUE_GRACE_DAYS * DAY_MS);
    case "canceled":
      return isBefore(now, subscription.currentPeriodEnd);
    case "pending":
      return false;
  }
}

export function effectivePlan(subscriptions: (AccessWindow & { planKey: string })[], now: Date): PlanKey {
  const granting = subscriptions.find((subscription) => grantsAccess(subscription, now));
  return granting && isPlanKey(granting.planKey) ? granting.planKey : DEFAULT_PLAN;
}

export function can(plan: PlanKey, feature: Feature) {
  return planFeatures(plan).includes(feature);
}
