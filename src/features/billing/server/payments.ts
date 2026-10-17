import prisma from "@/lib/prisma";
import { refundableAmount, refundedStatus, type RefundMode } from "../lib/proration";
import { getBillingProvider } from "../providers";
import type { PaymentSnapshot } from "../providers/types";
import type { PaymentStatus } from "../types";
import { recordBillingEvent } from "./events";
import { cancelSubscription } from "./cancel";
import { toBillingInterval, toPaymentStatus, toSubscriptionRow } from "./rows";
import { applySnapshot } from "./subscriptions";

const REFUNDABLE_STATUSES: PaymentStatus[] = ["approved", "partially_refunded"];
const LOCAL_REFUND_STATUSES: PaymentStatus[] = ["refunded", "partially_refunded"];

export type RefundOutcome =
  | { kind: "refunded"; amount: number; status: PaymentStatus }
  | { kind: "not_found" }
  | { kind: "not_refundable" }
  | { kind: "conflict" };

function resolvePaymentStatus(current: PaymentStatus | null, incoming: PaymentStatus): PaymentStatus {
  const refundedLocally = current !== null && LOCAL_REFUND_STATUSES.includes(current);
  const providerStillApproved = incoming === "approved";
  if (refundedLocally && providerStillApproved) return current;
  return incoming;
}

export async function recordPayment(providerName: string, snapshot: PaymentSnapshot) {
  const subscriptionRow = await prisma.subscription.findUnique({
    where: { provider_externalId: { provider: providerName, externalId: snapshot.subscriptionExternalId } },
  });
  if (!subscriptionRow) return null;
  const subscription = toSubscriptionRow(subscriptionRow);

  const key = { provider_externalId: { provider: providerName, externalId: snapshot.externalId } };
  const existing = await prisma.billingPayment.findUnique({ where: key, select: { status: true } });
  const currentStatus = existing ? toPaymentStatus(existing.status) : null;
  const status = resolvePaymentStatus(currentStatus, snapshot.status);

  await prisma.billingPayment.upsert({
    where: key,
    create: {
      subscriptionId: subscription.id,
      provider: providerName,
      externalId: snapshot.externalId,
      providerPaymentId: snapshot.providerPaymentId,
      status,
      amount: snapshot.amount,
      currency: snapshot.currency,
      paidAt: snapshot.paidAt,
    },
    update: {
      status,
      providerPaymentId: snapshot.providerPaymentId,
      paidAt: snapshot.paidAt,
    },
  });

  if (subscription.externalId) {
    const provider = getBillingProvider(providerName);
    const subscriptionSnapshot = await provider.getSubscription(subscription.externalId);
    await applySnapshot(subscription, subscriptionSnapshot);
  }
  return subscription;
}

interface RefundRequest {
  paymentId: string;
  mode: RefundMode;
  revokeAccess: boolean;
}

export async function refundPayment(
  { paymentId, mode, revokeAccess }: RefundRequest,
  now = new Date(),
): Promise<RefundOutcome> {
  const payment = await prisma.billingPayment.findUnique({
    where: { id: paymentId },
    include: { subscription: true },
  });
  if (!payment) return { kind: "not_found" };

  const { providerPaymentId } = payment;
  const isRefundableStatus = REFUNDABLE_STATUSES.includes(toPaymentStatus(payment.status));
  if (!providerPaymentId || !isRefundableStatus) return { kind: "not_refundable" };

  const interval = toBillingInterval(payment.subscription.interval);
  const amount = refundableAmount(payment, mode, interval, now);
  if (amount <= 0) return { kind: "not_refundable" };

  await getBillingProvider(payment.provider).refundPayment({
    providerPaymentId,
    amount,
    idempotencyKey: `refund:${payment.id}:${payment.refundedAmount}`,
  });

  const refundedAmount = payment.refundedAmount + amount;
  const status = refundedStatus(payment.amount, refundedAmount);
  const { count } = await prisma.billingPayment.updateMany({
    where: { id: payment.id, refundedAmount: payment.refundedAmount },
    data: { refundedAmount, status },
  });
  if (count === 0) return { kind: "conflict" };

  if (revokeAccess) {
    await cancelSubscription(toSubscriptionRow(payment.subscription), { source: "admin", immediate: true, now });
  }
  await recordBillingEvent({
    source: "admin",
    type: "payment.refunded",
    userId: payment.subscription.userId,
    subscriptionId: payment.subscriptionId,
    data: { paymentId: payment.id, amount, mode, revokeAccess },
  });
  return { kind: "refunded", amount, status };
}
