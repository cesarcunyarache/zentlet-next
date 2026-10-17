import { isUniqueViolation } from "@/lib/db-errors";
import { logger } from "@/lib/observability/logger";
import { reportError } from "@/lib/observability/server";
import prisma from "@/lib/prisma";
import type { WebhookNotification } from "../../../../providers/types";
import type { NewBillingEvent, WebhookEventOutcome } from "../../../domain/entities/billing-event.entity";
import type { BillingEventRepository } from "../../../domain/repositories/billing-event.repository";

export class PrismaBillingEventRepository implements BillingEventRepository {
  async record({ source, type, userId, subscriptionId, data }: NewBillingEvent) {
    logger.info({ source, userId, subscriptionId, ...data }, `billing.${type}`);
    try {
      await prisma.billingEvent.create({
        data: { source, type, userId, subscriptionId, data, processedAt: new Date() },
      });
    } catch (error) {
      reportError(error, "billing.event_record_failed", { type, subscriptionId });
    }
  }

  async claimWebhook(provider: string, notification: WebhookNotification) {
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
      const alreadyClaimed = isUniqueViolation(error);
      if (!alreadyClaimed) throw error;

      return prisma.billingEvent.findUniqueOrThrow({
        where: { provider_externalId: { provider, externalId: notification.eventId } },
      });
    }
  }

  async markProcessed(id: string, outcome: WebhookEventOutcome) {
    const subscription = outcome.kind === "matched" ? outcome.subscription : undefined;

    await prisma.billingEvent.update({
      where: { id },
      data: {
        processedAt: new Date(),
        subscriptionId: subscription?.id,
        userId: subscription?.userId,
        data: outcome.kind === "unmatched" ? { unmatched: true } : undefined,
      },
    });
  }
}
