import prisma from "@/lib/prisma";
import type { PaymentRecord, Refund } from "../../../domain/entities/payment.entity";
import type { PaymentRepository } from "../../../domain/repositories/payment.repository";
import { toPaymentStatus, toPaymentWithSubscription } from "./billing.mapper";

const byProviderId = (provider: string, externalId: string) => ({ provider_externalId: { provider, externalId } });

export class PrismaPaymentRepository implements PaymentRepository {
  async findStatus(provider: string, externalId: string) {
    const payment = await prisma.billingPayment.findUnique({
      where: byProviderId(provider, externalId),
      select: { status: true },
    });
    if (!payment) return null;
    return toPaymentStatus(payment.status);
  }

  async findLatestStatus(subscriptionId: string) {
    const payment = await prisma.billingPayment.findFirst({
      where: { subscriptionId },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    });
    if (!payment) return null;
    return toPaymentStatus(payment.status);
  }

  async findWithSubscription(id: string) {
    const row = await prisma.billingPayment.findUnique({
      where: { id },
      include: { subscription: true },
    });
    if (!row) return null;
    return toPaymentWithSubscription(row);
  }

  async upsert(payment: PaymentRecord) {
    await prisma.billingPayment.upsert({
      where: byProviderId(payment.provider, payment.externalId),
      create: payment,
      update: {
        status: payment.status,
        providerPaymentId: payment.providerPaymentId,
        paidAt: payment.paidAt,
      },
    });
  }

  async recordRefund(id: string, { previousRefundedAmount, refundedAmount, status }: Refund) {
    const { count } = await prisma.billingPayment.updateMany({
      where: { id, refundedAmount: previousRefundedAmount },
      data: { refundedAmount, status },
    });
    if (count === 0) return "conflict" as const;
    return "recorded" as const;
  }
}
