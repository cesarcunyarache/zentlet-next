import { Injectable } from '@nestjs/common';
import type { WebhookNotification } from '../domain/billing-provider.js';
import { BillingEventRepository } from '../domain/billing-event.repository.js';
import type { ClaimedWebhookEvent, NewBillingEvent, WebhookEventOutcome } from '../domain/entities/billing-event.js';

type StoredEvent = ClaimedWebhookEvent & { provider: string; externalId: string; outcome?: WebhookEventOutcome };

@Injectable()
export class InMemoryBillingEventRepository extends BillingEventRepository {
  readonly recorded: NewBillingEvent[] = [];
  private readonly webhookEvents = new Map<string, StoredEvent>();

  async record(event: NewBillingEvent): Promise<void> {
    this.recorded.push(event);
  }

  async claimWebhook(provider: string, notification: WebhookNotification): Promise<ClaimedWebhookEvent> {
    const key = `${provider}:${notification.eventId}`;
    const existing = this.webhookEvents.get(key);
    if (existing) return existing;

    const created: StoredEvent = { id: crypto.randomUUID(), processedAt: null, provider, externalId: notification.eventId };
    this.webhookEvents.set(key, created);
    return created;
  }

  async markProcessed(id: string, outcome: WebhookEventOutcome): Promise<void> {
    for (const [key, event] of this.webhookEvents) {
      if (event.id === id) this.webhookEvents.set(key, { ...event, processedAt: new Date(), outcome });
    }
  }
}
