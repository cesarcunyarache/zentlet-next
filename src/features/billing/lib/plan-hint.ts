import type { BillingSummary } from "../types";

export type PlanHintKey = "free" | "trial" | "active" | "pastDue" | "canceled" | "pending";
export type PlanAction = "startTrial" | "upgrade" | "cancel";

interface PlanHint {
  key: PlanHintKey;
  date: string | null;
}

export function planHint(summary: BillingSummary): PlanHint {
  if (summary.plan === "free") return { key: summary.hasPendingCheckout ? "pending" : "free", date: null };
  switch (summary.status) {
    case "trialing":
      return { key: "trial", date: summary.trialEndsAt };
    case "past_due":
      return { key: "pastDue", date: null };
    case "canceled":
      return { key: "canceled", date: summary.currentPeriodEnd };
    default:
      return { key: "active", date: summary.currentPeriodEnd };
  }
}

export function planAction(summary: BillingSummary): PlanAction {
  const hasPaidPlan = summary.plan !== "free" && summary.status !== "canceled";
  if (hasPaidPlan) return "cancel";
  return summary.isTrialEligible ? "startTrial" : "upgrade";
}
