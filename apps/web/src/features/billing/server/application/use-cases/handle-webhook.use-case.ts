import {
  BillingProviderError,
  type BillingProvider,
  type SubscriptionSnapshot,
  type WebhookNotification,
} from "../../../providers/types";
import type { WebhookEventOutcome } from "../../domain/entities/billing-event.entity";
import type { BillingMonitor, BillingProviders } from "../../domain/ports/billing.ports";
import type { BillingEventRepository } from "../../domain/repositories/billing-event.repository";
import type { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import type { SubscriptionLifecycle } from "../services/subscription-lifecycle.service";
import type { RecordPaymentUseCase } from "./record-payment.use-case";

const NOT_FOUND = 404;

export type WebhookOutcome = "invalid" | "duplicate" | "processed" | "ignored";

export class HandleWebhookUseCase {
  constructor(
    private readonly billingProviders: BillingProviders,
    private readonly billingEventRepository: BillingEventRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionLifecycle: SubscriptionLifecycle,
    private readonly recordPayment: RecordPaymentUseCase,
    private readonly billingMonitor: BillingMonitor,
  ) {}

  async execute(providerName: string, req: Request): Promise<WebhookOutcome> {
    if (!this.billingProviders.isKnown(providerName)) return "invalid";
    const provider = this.billingProviders.get(providerName);

    const notification = await provider.parseWebhook(req);
    if (!notification) return "invalid";

    const event = await this.billingEventRepository.claimWebhook(provider.name, notification);
    if (event.processedAt) return "duplicate";

    if (notification.resource === "ignored") {
      await this.billingEventRepository.markProcessed(event.id, { kind: "ignored" });
      return "ignored";
    }

    const subscription = await this.processResource(provider, notification);
    const outcome: WebhookEventOutcome = subscription ? { kind: "matched", subscription } : { kind: "unmatched" };
    await this.billingEventRepository.markProcessed(event.id, outcome);

    return "processed";
  }

  private async processResource(provider: BillingProvider, { resource, resourceId }: WebhookNotification) {
    try {
      if (resource === "subscription") return await this.processSubscription(provider, resourceId);
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
      this.billingMonitor.warn("billing.webhook_reference_mismatch", { subscriptionId: subscription.id, resourceId });
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
