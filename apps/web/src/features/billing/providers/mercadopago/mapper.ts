import type { PaymentStatus, SubscriptionStatus } from "../../types";
import { BillingProviderError, type CheckoutInput, type PaymentSnapshot, type SubscriptionSnapshot } from "../types";

const MIN_START_OFFSET_MS = 60_000;

export interface MpPreapproval {
  id: string;
  status: string;
  external_reference?: string | null;
  next_payment_date?: string | null;
  init_point?: string | null;
}

export interface MpAuthorizedPayment {
  id: number | string;
  preapproval_id: string;
  status: string;
  transaction_amount: number;
  currency_id: string;
  debit_date?: string | null;
  date_created?: string | null;
  payment?: { id?: number | string | null; status?: string | null } | null;
}

const SUBSCRIPTION_STATUS: Record<string, SubscriptionStatus> = {
  pending: "pending",
  authorized: "active",
  paused: "past_due",
  cancelled: "canceled",
  finished: "canceled",
};

const PAYMENT_STATUS: Record<string, PaymentStatus> = {
  approved: "approved",
  authorized: "pending",
  in_process: "pending",
  pending: "pending",
  rejected: "failed",
  cancelled: "failed",
  refunded: "refunded",
  charged_back: "refunded",
};

export const toCents = (amount: number) => Math.round(amount * 100);
export const fromCents = (cents: number) => cents / 100;
const toDate = (value?: string | null) => (value ? new Date(value) : null);

export function checkoutBody(input: CheckoutInput, now: Date) {
  const startsLater = input.firstChargeAt.getTime() - now.getTime() > MIN_START_OFFSET_MS;
  return {
    reason: input.reason,
    external_reference: input.subscriptionId,
    payer_email: input.payerEmail,
    back_url: input.returnUrl,
    status: "pending",
    auto_recurring: {
      frequency: input.interval === "year" ? 12 : 1,
      frequency_type: "months",
      transaction_amount: fromCents(input.amount),
      currency_id: input.currency,
      ...(startsLater && { start_date: input.firstChargeAt.toISOString() }),
    },
  };
}

export function toSubscriptionSnapshot(preapproval: MpPreapproval): SubscriptionSnapshot {
  const status = SUBSCRIPTION_STATUS[preapproval.status];
  if (!status) throw new BillingProviderError(`Unknown preapproval status: ${preapproval.status}`, 502);
  return {
    externalId: preapproval.id,
    reference: preapproval.external_reference ?? null,
    status,
    currentPeriodEnd: toDate(preapproval.next_payment_date),
  };
}

function paymentStatus(authorized: MpAuthorizedPayment): PaymentStatus {
  const fromPayment = authorized.payment?.status ? PAYMENT_STATUS[authorized.payment.status] : undefined;
  if (fromPayment) return fromPayment;
  if (authorized.status === "recycling" || authorized.status === "cancelled") return "failed";
  return "pending";
}

export function toPaymentSnapshot(authorized: MpAuthorizedPayment): PaymentSnapshot {
  const status = paymentStatus(authorized);
  const providerPaymentId = authorized.payment?.id;
  return {
    externalId: String(authorized.id),
    subscriptionExternalId: authorized.preapproval_id,
    providerPaymentId: providerPaymentId ? String(providerPaymentId) : null,
    status,
    amount: toCents(authorized.transaction_amount),
    currency: authorized.currency_id,
    paidAt: status === "approved" ? toDate(authorized.debit_date ?? authorized.date_created) : null,
  };
}
