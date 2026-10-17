import { refundableAmount, refundedStatus, type RefundMode } from "../../../lib/proration";
import type { PaymentStatus } from "../../../types";
import type { BillingProviders } from "../../domain/ports/billing.ports";
import type { BillingEventRepository } from "../../domain/repositories/billing-event.repository";
import type { PaymentRepository } from "../../domain/repositories/payment.repository";
import type { SubscriptionLifecycle } from "../services/subscription-lifecycle.service";

const REFUNDABLE_STATUSES: PaymentStatus[] = ["approved", "partially_refunded"];

export interface RefundRequest {
  paymentId: string;
  mode: RefundMode;
  revokeAccess: boolean;
}

export type RefundOutcome =
  | { kind: "refunded"; amount: number; status: PaymentStatus }
  | { kind: "not_found" }
  | { kind: "not_refundable" }
  | { kind: "conflict" };

export class RefundPaymentUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly billingProviders: BillingProviders,
    private readonly billingEventRepository: BillingEventRepository,
    private readonly subscriptionLifecycle: SubscriptionLifecycle,
  ) {}

  async execute({ paymentId, mode, revokeAccess }: RefundRequest, now = new Date()): Promise<RefundOutcome> {
    const payment = await this.paymentRepository.findWithSubscription(paymentId);
    if (!payment) return { kind: "not_found" };

    const { providerPaymentId } = payment;
    const isRefundableStatus = REFUNDABLE_STATUSES.includes(payment.status);
    if (!providerPaymentId || !isRefundableStatus) return { kind: "not_refundable" };

    const amount = refundableAmount(payment, mode, payment.subscription.interval, now);
    if (amount <= 0) return { kind: "not_refundable" };

    await this.billingProviders.get(payment.provider).refundPayment({
      providerPaymentId,
      amount,
      idempotencyKey: `refund:${payment.id}:${payment.refundedAmount}`,
    });

    const refundedAmount = payment.refundedAmount + amount;
    const status = refundedStatus(payment.amount, refundedAmount);
    const recorded = await this.paymentRepository.recordRefund(payment.id, {
      previousRefundedAmount: payment.refundedAmount,
      refundedAmount,
      status,
    });
    if (recorded === "conflict") return { kind: "conflict" };

    if (revokeAccess) {
      await this.subscriptionLifecycle.cancel(payment.subscription, { source: "admin", immediate: true, now });
    }
    await this.billingEventRepository.record({
      source: "admin",
      type: "payment.refunded",
      userId: payment.subscription.userId,
      subscriptionId: payment.subscriptionId,
      data: { paymentId: payment.id, amount, mode, revokeAccess },
    });

    return { kind: "refunded", amount, status };
  }
}
