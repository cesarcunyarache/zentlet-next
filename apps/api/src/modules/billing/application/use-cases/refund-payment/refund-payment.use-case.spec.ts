import { beforeEach, describe, expect, it } from 'vitest';
import type { BillingPayment } from '../../../domain/entities/billing-payment.js';
import { InMemoryBillingEventRepository } from '../../../infrastructure/in-memory-billing-event.repository.js';
import { InMemoryBillingPaymentRepository } from '../../../infrastructure/in-memory-billing-payment.repository.js';
import { InMemorySubscriptionRepository } from '../../../infrastructure/in-memory-subscription.repository.js';
import { SubscriptionLifecycleService } from '../../services/subscription-lifecycle.service.js';
import { FakeBillingProvider, FakeBillingProviderRegistry } from '../billing-test-doubles.js';
import { RefundPaymentUseCase } from './refund-payment.use-case.js';

const NOW = new Date('2026-10-15T12:00:00Z');

describe('RefundPaymentUseCase', () => {
  let subscriptionRepository: InMemorySubscriptionRepository;
  let billingPaymentRepository: InMemoryBillingPaymentRepository;
  let billingEventRepository: InMemoryBillingEventRepository;
  let provider: FakeBillingProvider;
  let useCase: RefundPaymentUseCase;

  beforeEach(() => {
    subscriptionRepository = new InMemorySubscriptionRepository();
    billingPaymentRepository = new InMemoryBillingPaymentRepository();
    billingEventRepository = new InMemoryBillingEventRepository();
    provider = new FakeBillingProvider();
    const registry = new FakeBillingProviderRegistry(provider);
    const lifecycle = new SubscriptionLifecycleService(subscriptionRepository, billingPaymentRepository, billingEventRepository, registry);
    useCase = new RefundPaymentUseCase(billingPaymentRepository, registry, billingEventRepository, lifecycle);
  });

  async function seedActiveSubscriptionWithPayment(refundedAmount = 0): Promise<{ subscriptionId: string }> {
    const created = await subscriptionRepository.createPending({
      userId: 'user-1',
      planKey: 'pro',
      amount: 1490,
      currency: 'PEN',
      interval: 'month',
      provider: 'mercadopago',
      trialEndsAt: null,
    });
    if (created === 'live_exists') throw new Error('unexpected live_exists');
    await subscriptionRepository.applyProviderState(created.id, {
      status: 'active',
      externalId: 'pre-1',
      currentPeriodEnd: null,
      canceledAt: null,
    });
    const [subscription] = await subscriptionRepository.findHistory('user-1', 10);
    billingPaymentRepository.registerSubscription(subscription);

    const payment: BillingPayment = {
      id: 'pay-1',
      subscriptionId: subscription.id,
      provider: 'mercadopago',
      externalId: 'pre-1',
      providerPaymentId: '99',
      status: 'approved',
      amount: 1490,
      refundedAmount,
      currency: 'PEN',
      paidAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    };
    billingPaymentRepository.seed(payment);

    return { subscriptionId: subscription.id };
  }

  it('returns not_found for an unknown payment', async () => {
    expect(await useCase.execute({ paymentId: 'missing', mode: 'full', revokeAccess: false }, NOW)).toEqual({ kind: 'not_found' });
  });

  it('refuses to refund a payment that was never charged', async () => {
    const { subscriptionId } = await seedActiveSubscriptionWithPayment();
    billingPaymentRepository.seed({
      id: 'pay-2',
      subscriptionId,
      provider: 'mercadopago',
      externalId: 'pre-1-b',
      providerPaymentId: null,
      status: 'pending',
      amount: 1490,
      refundedAmount: 0,
      currency: 'PEN',
      paidAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });

    expect(await useCase.execute({ paymentId: 'pay-2', mode: 'full', revokeAccess: false }, NOW)).toEqual({ kind: 'not_refundable' });
    expect(provider.refundPayment).not.toHaveBeenCalled();
  });

  it('refunds the full remaining amount and reuses the same idempotency key as before', async () => {
    await seedActiveSubscriptionWithPayment(490);

    const outcome = await useCase.execute({ paymentId: 'pay-1', mode: 'full', revokeAccess: false }, NOW);

    expect(outcome).toEqual({ kind: 'refunded', amount: 1000, status: 'refunded' });
    expect(provider.refundPayment).toHaveBeenCalledWith({ providerPaymentId: '99', amount: 1000, idempotencyKey: 'refund:pay-1:490' });
    expect(billingEventRepository.recorded).toContainEqual(expect.objectContaining({ type: 'payment.refunded', subscriptionId: expect.any(String) }));
  });

  it('revokes access immediately when asked to', async () => {
    const { subscriptionId } = await seedActiveSubscriptionWithPayment();

    await useCase.execute({ paymentId: 'pay-1', mode: 'full', revokeAccess: true }, NOW);

    expect(provider.cancelSubscription).toHaveBeenCalledWith('pre-1');
    const [canceled] = await subscriptionRepository.findHistory('user-1', 10);
    expect(canceled.id).toBe(subscriptionId);
    expect(canceled).toMatchObject({ status: 'canceled', canceledAt: NOW });
  });

  it('returns conflict when another refund already moved the refunded amount', async () => {
    await seedActiveSubscriptionWithPayment();
    billingPaymentRepository.recordRefund = async () => 'conflict';

    expect(await useCase.execute({ paymentId: 'pay-1', mode: 'full', revokeAccess: false }, NOW)).toEqual({ kind: 'conflict' });
    expect(provider.refundPayment).toHaveBeenCalled();
  });
});
