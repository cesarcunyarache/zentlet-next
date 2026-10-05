import { isUniqueViolation } from "@/lib/db-errors";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { getBillingProvider, isProviderName } from "../providers";
import { BillingProviderError, type BillingProvider, type WebhookNotification } from "../providers/types";
import { recordPayment } from "./payments";
import { applySnapshot, type SubscriptionRow } from "./subscriptions";

const NOT_FOUND = 404;

export type WebhookOutcome = "invalid" | "duplicate" | "processed" | "ignored";

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

async function findByReference(provider: BillingProvider, externalId: string, reference: string | null) {
  const byExternalId = await prisma.subscription.findUnique({
    where: { provider_externalId: { provider: provider.name, externalId } },
  });
  if (byExternalId) return byExternalId as SubscriptionRow;
  if (!reference) return null;
  return (await prisma.subscription.findFirst({
    where: { id: reference, provider: provider.name },
  })) as SubscriptionRow | null;
}

async function processSubscription(provider: BillingProvider, resourceId: string) {
  const snapshot = await provider.getSubscription(resourceId);
  const subscription = await findByReference(provider, snapshot.externalId, snapshot.reference);
  if (!subscription) return null;
  if (snapshot.reference && snapshot.reference !== subscription.id) {
    logger.warn({ subscriptionId: subscription.id, resourceId }, "billing.webhook_reference_mismatch");
    return null;
  }
  return applySnapshot(subscription, snapshot);
}

async function processPayment(provider: BillingProvider, resourceId: string) {
  return recordPayment(provider.name, await provider.getPayment(resourceId));
}

async function processResource(provider: BillingProvider, { resource, resourceId }: WebhookNotification) {
  try {
    return resource === "subscription"
      ? await processSubscription(provider, resourceId)
      : await processPayment(provider, resourceId);
  } catch (error) {
    if (error instanceof BillingProviderError && error.status === NOT_FOUND) return null;
    throw error;
  }
}

async function markProcessed(eventId: string, subscription?: SubscriptionRow | null) {
  await prisma.billingEvent.update({
    where: { id: eventId },
    data: {
      processedAt: new Date(),
      subscriptionId: subscription?.id,
      userId: subscription?.userId,
      data: subscription === null ? { unmatched: true } : undefined,
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
    await markProcessed(event.id);
    return "ignored";
  }

  await markProcessed(event.id, await processResource(provider, notification));
  return "processed";
}
