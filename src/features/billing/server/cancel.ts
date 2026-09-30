import prisma from "@/lib/prisma";
import { getBillingProvider } from "../providers";
import type { BillingEventSource } from "../types";
import { recordBillingEvent } from "./events";
import {
  abandonPending,
  findLiveSubscription,
  type SubscriptionRow,
} from "./subscriptions";

interface CancelOptions {
  source: BillingEventSource;
  immediate?: boolean;
  now?: Date;
}

export async function cancelSubscription(
  subscription: SubscriptionRow,
  { source, immediate = false, now = new Date() }: CancelOptions,
) {
  if (subscription.externalId && subscription.status !== "canceled") {
    await getBillingProvider(subscription.provider).cancelSubscription(
      subscription.externalId,
    );
  }
  if (subscription.status === "pending")
    return abandonPending(subscription, now);

  const accessUntil = immediate
    ? now
    : (subscription.currentPeriodEnd ?? subscription.trialEndsAt);
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "canceled",
      canceledAt: subscription.canceledAt ?? now,
      currentPeriodEnd: accessUntil,
      checkoutUrl: null,
    },
  });
  await recordBillingEvent({
    source,
    type: "subscription.canceled",
    userId: subscription.userId,
    subscriptionId: subscription.id,
    data: {
      from: subscription.status,
      immediate,
      accessUntil: accessUntil?.toISOString() ?? null,
    },
  });
}

export async function cancelUserSubscription(
  userId: string,
  source: BillingEventSource = "user",
) {
  const live = await findLiveSubscription(userId);
  if (!live) return false;
  await cancelSubscription(live, { source });
  return true;
}
