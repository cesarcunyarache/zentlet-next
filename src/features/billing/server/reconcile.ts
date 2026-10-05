import prisma from "@/lib/prisma";
import { reportError } from "@/lib/observability/server";
import { CHECKOUT_REUSE_MS } from "../lib/lifecycle";
import { cancelSubscription } from "./cancel";
import { syncSubscription, type SubscriptionRow } from "./subscriptions";

const BATCH_SIZE = 100;
const PENDING_SYNC_AFTER_MS = 60 * 60 * 1000;
const PENDING_ABANDON_AFTER_MS = 7 * CHECKOUT_REUSE_MS;

export interface ReconcileResult {
  synced: number;
  abandoned: number;
  failed: number;
}

async function dueSubscriptions(now: Date) {
  const rows = await prisma.subscription.findMany({
    where: {
      OR: [
        { status: "pending", createdAt: { lt: new Date(now.getTime() - PENDING_SYNC_AFTER_MS) } },
        { status: { in: ["trialing", "active"] }, currentPeriodEnd: { lt: now } },
        { status: "past_due" },
      ],
    },
    orderBy: { updatedAt: "asc" },
    take: BATCH_SIZE,
  });
  return rows as SubscriptionRow[];
}

const isAbandoned = (subscription: SubscriptionRow, now: Date) =>
  subscription.status === "pending" && now.getTime() - subscription.createdAt.getTime() > PENDING_ABANDON_AFTER_MS;

export async function reconcileSubscriptions(now = new Date()): Promise<ReconcileResult> {
  const result: ReconcileResult = { synced: 0, abandoned: 0, failed: 0 };
  for (const subscription of await dueSubscriptions(now)) {
    try {
      const synced = await syncSubscription(subscription);
      if (isAbandoned(synced, now)) {
        await cancelSubscription(synced, { source: "system", now });
        result.abandoned += 1;
      } else {
        result.synced += 1;
      }
    } catch (error) {
      result.failed += 1;
      reportError(error, "billing.reconcile_failed", { subscriptionId: subscription.id });
    }
  }
  return result;
}
