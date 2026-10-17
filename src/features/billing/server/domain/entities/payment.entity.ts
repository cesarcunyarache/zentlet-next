import type { PaymentStatus } from "../../../types";
import type { Subscription } from "./subscription.entity";

export interface Payment {
  id: string;
  subscriptionId: string;
  provider: string;
  externalId: string;
  providerPaymentId: string | null;
  status: PaymentStatus;
  amount: number;
  refundedAmount: number;
  currency: string;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentWithSubscription = Payment & { subscription: Subscription };

export type PaymentRecord = Pick<
  Payment,
  "subscriptionId" | "provider" | "externalId" | "providerPaymentId" | "status" | "amount" | "currency" | "paidAt"
>;

export interface Refund {
  previousRefundedAmount: number;
  refundedAmount: number;
  status: PaymentStatus;
}
