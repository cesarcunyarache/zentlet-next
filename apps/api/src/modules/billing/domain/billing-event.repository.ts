import type { WebhookNotification } from './billing-provider.js';
import type { ClaimedWebhookEvent, NewBillingEvent, WebhookEventOutcome } from './billing-event.js';

export abstract class BillingEventRepository {
  abstract record(event: NewBillingEvent): Promise<void>;

  abstract claimWebhook(provider: string, notification: WebhookNotification): Promise<ClaimedWebhookEvent>;

  abstract markProcessed(id: string, outcome: WebhookEventOutcome): Promise<void>;
}
