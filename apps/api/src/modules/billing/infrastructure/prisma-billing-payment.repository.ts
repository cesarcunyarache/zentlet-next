import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { BillingPaymentRepository } from '../domain/billing-payment.repository.js';
import type { PaymentRecord, Refund } from '../domain/entities/billing-payment.js';
import { toPaymentStatus, toPaymentWithSubscription } from './prisma-billing.mapper.js';

const byProviderId = (provider: string, externalId: string) => ({ provider_externalId: { provider, externalId } });

@Injectable()
export class PrismaBillingPaymentRepository extends BillingPaymentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findStatus(provider: string, externalId: string) {
    const payment = await this.prisma.billingPayment.findUnique({
      where: byProviderId(provider, externalId),
      select: { status: true },
    });
    return payment ? toPaymentStatus(payment.status) : null;
  }

  async findLatestStatus(subscriptionId: string) {
    const payment = await this.prisma.billingPayment.findFirst({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    });
    return payment ? toPaymentStatus(payment.status) : null;
  }

  async findWithSubscription(id: string) {
    const row = await this.prisma.billingPayment.findUnique({
      where: { id },
      include: { subscription: true },
    });
    return row ? toPaymentWithSubscription(row) : null;
  }

  async upsert(payment: PaymentRecord): Promise<void> {
    await this.prisma.billingPayment.upsert({
      where: byProviderId(payment.provider, payment.externalId),
      create: payment,
      update: {
        status: payment.status,
        providerPaymentId: payment.providerPaymentId,
        paidAt: payment.paidAt,
      },
    });
  }

  async recordRefund(id: string, { previousRefundedAmount, refundedAmount, status }: Refund): Promise<'recorded' | 'conflict'> {
    const { count } = await this.prisma.billingPayment.updateMany({
      where: { id, refundedAmount: previousRefundedAmount },
      data: { refundedAmount, status },
    });
    return count === 0 ? 'conflict' : 'recorded';
  }
}
