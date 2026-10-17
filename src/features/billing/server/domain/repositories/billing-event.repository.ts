import type { WebhookNotification } from "../../../providers/types";
import type { NewBillingEvent, WebhookEvent, WebhookEventOutcome } from "../entities/billing-event.entity";

export interface BillingEventRepository {
  record(event: NewBillingEvent): Promise<void>;

  claimWebhook(provider: string, notification: WebhookNotification): Promise<WebhookEvent>;

  markProcessed(id: string, outcome: WebhookEventOutcome): Promise<void>;
}
