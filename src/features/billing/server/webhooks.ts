import { isUniqueViolation } from "@/lib/db-errors";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { getBillingProvider, isProviderName } from "../providers";
import {
  BillingProviderError,
  type BillingProvider,
  type SubscriptionSnapshot,
  type WebhookNotification,
} from "../providers/types";
import { recordPayment } from "./payments";
import { toSubscriptionRow, toSubscriptionRowOrNull, type SubscriptionRow } from "./rows";
import { applySnapshot } from "./subscriptions";

const NOT_FOUND = 404;

export type WebhookOutcome = "invalid" | "duplicate" | "processed" | "ignored";

type ProcessingResult =
  | { kind: "ignored" }
  | { kind: "unmatched" }
  | { kind: "matched"; subscription: SubscriptionRow };

async function claimEvent(provider: string, notification: WebhookNotification) {
  try {
    return await prisma.billingEvent.create({
      data: {
        source: "webhook",
        provider,
        externalId: notification.eventId,
        type: notification.type,
        resourceId: notification.resourceId,
      },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return prisma.billingEvent.findUniqueOrThrow({
      where: { provider_externalId: { provider, externalId: notification.eventId } },
    });
  }
}

async function findSubscriptionForSnapshot(provider: BillingProvider, snapshot: SubscriptionSnapshot) {
  const byExternalId = await prisma.subscription.findUnique({
    where: { provider_externalId: { provider: provider.name, externalId: snapshot.externalId } },
  });
  if (byExternalId) return toSubscriptionRow(byExternalId);
  if (!snapshot.reference) return null;

  const byReference = await prisma.subscription.findFirst({
    where: { id: snapshot.reference, provider: provider.name },
  });
  return toSubscriptionRowOrNull(byReference);
}

async function processSubscription(provider: BillingProvider, resourceId: string) {
  const snapshot = await provider.getSubscription(resourceId);
  const subscription = await findSubscriptionForSnapshot(provider, snapshot);
  if (!subscription) return null;

  const referencesAnotherSubscription = Boolean(snapshot.reference) && snapshot.reference !== subscription.id;
  if (referencesAnotherSubscription) {
    logger.warn({ subscriptionId: subscription.id, resourceId }, "billing.webhook_reference_mismatch");
    return null;
  }

  return applySnapshot(subscription, snapshot);
}

async function processPayment(provider: BillingProvider, resourceId: string) {
  const snapshot = await provider.getPayment(resourceId);
  return recordPayment(provider.name, snapshot);
}

async function processResource(provider: BillingProvider, { resource, resourceId }: WebhookNotification) {
  try {
    if (resource === "subscription") return await processSubscription(provider, resourceId);
    return await processPayment(provider, resourceId);
  } catch (error) {
    const resourceGone = error instanceof BillingProviderError && error.status === NOT_FOUND;
    if (resourceGone) return null;
    throw error;
  }
}

async function markProcessed(eventId: string, result: ProcessingResult) {
  const subscription = result.kind === "matched" ? result.subscription : undefined;

  await prisma.billingEvent.update({
    where: { id: eventId },
    data: {
      processedAt: new Date(),
      subscriptionId: subscription?.id,
      userId: subscription?.userId,
      data: result.kind === "unmatched" ? { unmatched: true } : undefined,
    },
  });
}

export async function handleWebhook(providerName: string, req: Request): Promise<WebhookOutcome> {
  if (!isProviderName(providerName)) return "invalid";
  const provider = getBillingProvider(providerName);

  const notification = await provider.parseWebhook(req);
  if (!notification) return "invalid";

  const event = await claimEvent(provider.name, notification);
  if (event.processedAt) return "duplicate";

  if (notification.resource === "ignored") {
    await markProcessed(event.id, { kind: "ignored" });
    return "ignored";
  }

  const subscription = await processResource(provider, notification);
  const result: ProcessingResult = subscription ? { kind: "matched", subscription } : { kind: "unmatched" };
  await markProcessed(event.id, result);

  return "processed";
}
