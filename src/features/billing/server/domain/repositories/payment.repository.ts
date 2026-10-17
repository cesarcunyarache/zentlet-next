import type { PaymentStatus } from "../../../types";
import type { PaymentRecord, PaymentWithSubscription, Refund } from "../entities/payment.entity";

export interface PaymentRepository {
  findStatus(provider: string, externalId: string): Promise<PaymentStatus | null>;

  findLatestStatus(subscriptionId: string): Promise<PaymentStatus | null>;

  findWithSubscription(id: string): Promise<PaymentWithSubscription | null>;

  upsert(payment: PaymentRecord): Promise<void>;

  recordRefund(id: string, refund: Refund): Promise<"recorded" | "conflict">;
}
