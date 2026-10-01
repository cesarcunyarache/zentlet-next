import type { Subscription } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { effectivePlan } from "../lib/entitlements";
import { isTrialEligible, LIVE_STATUSES, resolveStatus } from "../lib/lifecycle";
import { PAID_PLAN_KEYS, planFeatures, planPrice } from "../lib/plans";
import { getBillingProvider } from "../providers";
import type { SubscriptionSnapshot } from "../providers/types";
import type { BillingSummary, PaymentStatus, SubscriptionStatus } from "../types";
import { recordBillingEvent } from "./events";

const HISTORY_LIMIT = 10;

export type SubscriptionRow = Subscription & { status: SubscriptionStatus };

export async function listUserSubscriptions(userId: string) {
  const rows = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  return rows as SubscriptionRow[];
}

export async function findLiveSubscription(userId: string) {
  const row = await prisma.subscription.findFirst({
    where: { userId, status: { in: [...LIVE_STATUSES] } },
  });
  return row as SubscriptionRow | null;
}

export async function getEffectivePlan(userId: string, now = new Date()) {
  return effectivePlan(await listUserSubscriptions(userId), now);
}

export async function getBillingSummary(userId: string, now = new Date()): Promise<BillingSummary> {
  const history = await listUserSubscriptions(userId);
  const plan = effectivePlan(history, now);
  const current = history.find((subscription) => subscription.status !== "pending") ?? history[0];
  return {
    plan,
    features: [...planFeatures(plan)],
    status: current?.status ?? null,
    trialEndsAt: current?.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: current?.currentPeriodEnd?.toISOString() ?? null,
    isTrialEligible: isTrialEligible(history),
    hasPendingCheckout: history.some((subscription) => subscription.status === "pending"),
    price: planPrice(PAID_PLAN_KEYS[0]),
  };
}

async function lastPaymentStatus(subscriptionId: string) {
  const payment = await prisma.billingPayment.findFirst({
    where: { subscriptionId },
    orderBy: { createdAt: "desc" },
    select: { status: true },
  });
  return (payment?.status as PaymentStatus | undefined) ?? null;
}

export async function applySnapshot(subscription: SubscriptionRow, snapshot: SubscriptionSnapshot, now = new Date()) {
  const status = resolveStatus({
    providerStatus: snapshot.status,
    lastPaymentStatus: await lastPaymentStatus(subscription.id),
    trialEndsAt: subscription.trialEndsAt,
    now,
  });
  const isNewlyCanceled = status === "canceled" && subscription.status !== "canceled";

  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status,
      externalId: snapshot.externalId,
      currentPeriodEnd: snapshot.currentPeriodEnd ?? subscription.currentPeriodEnd,
      canceledAt: isNewlyCanceled ? now : subscription.canceledAt,
    },
  });

  if (status !== subscription.status) {
    await recordBillingEvent({
      source: "system",
      type: "subscription.status_changed",
      userId: subscription.userId,
      subscriptionId: subscription.id,
      data: { from: subscription.status, to: status },
    });
  }
  return updated as SubscriptionRow;
}

export async function syncSubscription(subscription: SubscriptionRow) {
  if (!subscription.externalId) return subscription;
  const snapshot = await getBillingProvider(subscription.provider).getSubscription(subscription.externalId);
  return applySnapshot(subscription, snapshot);
}

export async function abandonPending(subscription: SubscriptionRow, now = new Date()) {
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "canceled", canceledAt: now, trialEndsAt: null, checkoutUrl: null },
  });
  await recordBillingEvent({
    source: "system",
    type: "checkout.abandoned",
    userId: subscription.userId,
    subscriptionId: subscription.id,
  });
}
