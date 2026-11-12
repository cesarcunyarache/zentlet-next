import { Injectable } from '@nestjs/common';
import { Logger } from '../../../../../shared/logger/domain/logger.js';
import { BillingProviderRegistry } from '../../../domain/billing-provider-registry.js';
import {
  BillingProviderError,
  type BillingProvider,
  type SubscriptionSnapshot,
  type WebhookNotification,
  type WebhookRequest,
} from '../../../domain/billing-provider.js';
import { BillingEventRepository } from '../../../domain/billing-event.repository.js';
import type { WebhookEventOutcome } from '../../../domain/billing-event.js';
import { SubscriptionRepository } from '../../../domain/subscription.repository.js';
import { SubscriptionLifecycleService } from '../../services/subscription-lifecycle.service.js';
import { RecordPaymentUseCase } from '../record-payment/record-payment.use-case.js';

const NOT_FOUND = 404;

export type WebhookOutcome = 'invalid' | 'duplicate' | 'processed' | 'ignored';

@Injectable()
export class HandleWebhookUseCase {
  constructor(
    private readonly billingProviderRegistry: BillingProviderRegistry,
    private readonly billingEventRepository: BillingEventRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionLifecycle: SubscriptionLifecycleService,
    private readonly recordPayment: RecordPaymentUseCase,
    private readonly logger: Logger,
  ) {}

  async execute(providerName: string, request: WebhookRequest): Promise<WebhookOutcome> {
    if (!this.billingProviderRegistry.isKnown(providerName)) return 'invalid';
    const provider = this.billingProviderRegistry.get(providerName);

    const notification = provider.parseWebhook(request);
    if (!notification) return 'invalid';

    const event = await this.billingEventRepository.claimWebhook(provider.name, notification);
    if (event.processedAt) return 'duplicate';

    if (notification.resource === 'ignored') {
      await this.billingEventRepository.markProcessed(event.id, { kind: 'ignored' });
      return 'ignored';
    }

    const subscription = await this.processResource(provider, notification);
    const outcome: WebhookEventOutcome = subscription ? { kind: 'matched', subscription } : { kind: 'unmatched' };
    await this.billingEventRepository.markProcessed(event.id, outcome);

    return 'processed';
  }

  private async processResource(provider: BillingProvider, { resource, resourceId }: WebhookNotification) {
    try {
      if (resource === 'subscription') return await this.processSubscription(provider, resourceId);
      return await this.processPayment(provider, resourceId);
    } catch (error) {
      const resourceGone = error instanceof BillingProviderError && error.status === NOT_FOUND;
      if (resourceGone) return null;
      throw error;
    }
  }

  private async processSubscription(provider: BillingProvider, resourceId: string) {
    const snapshot = await provider.getSubscription(resourceId);
    const subscription = await this.findSubscriptionForSnapshot(provider, snapshot);
    if (!subscription) return null;

    const referencesAnotherSubscription = Boolean(snapshot.reference) && snapshot.reference !== subscription.id;
    if (referencesAnotherSubscription) {
      this.logger.warn({ subscriptionId: subscription.id, resourceId }, 'billing.webhook_reference_mismatch');
      return null;
    }

    return this.subscriptionLifecycle.applySnapshot(subscription, snapshot);
  }

  private async processPayment(provider: BillingProvider, resourceId: string) {
    const snapshot = await provider.getPayment(resourceId);
    return this.recordPayment.execute(provider.name, snapshot);
  }

  private async findSubscriptionForSnapshot(provider: BillingProvider, snapshot: SubscriptionSnapshot) {
    const byExternalId = await this.subscriptionRepository.findByExternalId(provider.name, snapshot.externalId);
    if (byExternalId) return byExternalId;
    if (!snapshot.reference) return null;

    return this.subscriptionRepository.findByReference(provider.name, snapshot.reference);
  }
}
