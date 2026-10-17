import type { PaymentSnapshot } from "../../../providers/types";
import type { PaymentStatus } from "../../../types";
import type { BillingProviders } from "../../domain/ports/billing.ports";
import type { PaymentRepository } from "../../domain/repositories/payment.repository";
import type { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import type { SubscriptionLifecycle } from "../services/subscription-lifecycle.service";

const LOCAL_REFUND_STATUSES: PaymentStatus[] = ["refunded", "partially_refunded"];

function resolvePaymentStatus(current: PaymentStatus | null, incoming: PaymentStatus): PaymentStatus {
  const refundedLocally = current !== null && LOCAL_REFUND_STATUSES.includes(current);
  const providerStillApproved = incoming === "approved";
  if (refundedLocally && providerStillApproved) return current;
  return incoming;
}

export class RecordPaymentUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly billingProviders: BillingProviders,
    private readonly subscriptionLifecycle: SubscriptionLifecycle,
  ) {}

  async execute(providerName: string, snapshot: PaymentSnapshot) {
    const subscription = await this.subscriptionRepository.findByExternalId(
      providerName,
      snapshot.subscriptionExternalId,
    );
    if (!subscription) return null;

    const currentStatus = await this.paymentRepository.findStatus(providerName, snapshot.externalId);
    await this.paymentRepository.upsert({
      subscriptionId: subscription.id,
      provider: providerName,
      externalId: snapshot.externalId,
      providerPaymentId: snapshot.providerPaymentId,
      status: resolvePaymentStatus(currentStatus, snapshot.status),
      amount: snapshot.amount,
      currency: snapshot.currency,
      paidAt: snapshot.paidAt,
    });

    if (subscription.externalId) {
      const provider = this.billingProviders.get(providerName);
      const subscriptionSnapshot = await provider.getSubscription(subscription.externalId);
      await this.subscriptionLifecycle.applySnapshot(subscription, subscriptionSnapshot);
    }

    return subscription;
  }
}
