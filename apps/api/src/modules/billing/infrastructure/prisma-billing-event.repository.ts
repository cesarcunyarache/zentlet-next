import { Injectable } from '@nestjs/common';
import { Logger } from '../../../shared/logger/domain/logger.js';
import { PrismaService } from '../../../shared/prisma/infrastructure/prisma.service.js';
import type { WebhookNotification } from '../domain/billing-provider.js';
import { BillingEventRepository } from '../domain/billing-event.repository.js';
import type { ClaimedWebhookEvent, NewBillingEvent, WebhookEventOutcome } from '../domain/billing-event.js';
import { isUniqueViolation } from './db-errors.js';

@Injectable()
export class PrismaBillingEventRepository extends BillingEventRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
  ) {
    super();
  }

  async record({ source, type, userId, subscriptionId, data }: NewBillingEvent): Promise<void> {
    this.logger.info({ source, userId, subscriptionId, ...data }, `billing.${type}`);
    try {
      await this.prisma.billingEvent.create({
        data: { source, type, userId, subscriptionId, data, processedAt: new Date() },
      });
    } catch (error) {
      this.logger.error({ error, type, subscriptionId }, 'billing.event_record_failed');
    }
  }

  async claimWebhook(provider: string, notification: WebhookNotification): Promise<ClaimedWebhookEvent> {
    try {
      return await this.prisma.billingEvent.create({
        data: {
          source: 'webhook',
          provider,
          externalId: notification.eventId,
          type: notification.type,
          resourceId: notification.resourceId,
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;

      return this.prisma.billingEvent.findUniqueOrThrow({
        where: { provider_externalId: { provider, externalId: notification.eventId } },
      });
    }
  }

  async markProcessed(id: string, outcome: WebhookEventOutcome): Promise<void> {
    const subscription = outcome.kind === 'matched' ? outcome.subscription : undefined;

    await this.prisma.billingEvent.update({
      where: { id },
      data: {
        processedAt: new Date(),
        subscriptionId: subscription?.id,
        userId: subscription?.userId,
        data: outcome.kind === 'unmatched' ? { unmatched: true } : undefined,
      },
    });
  }
}
