import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryBillingEventRepository } from '../../../infrastructure/in-memory-billing-event.repository.js';
import { InMemoryBillingPaymentRepository } from '../../../infrastructure/in-memory-billing-payment.repository.js';
import { InMemorySubscriptionRepository } from '../../../infrastructure/in-memory-subscription.repository.js';
import { SubscriptionLifecycleService } from '../../services/subscription-lifecycle.service.js';
import { FakeBillingProvider } from '../../../infrastructure/fake-billing-provider.js';
import { FakeBillingProviderRegistry } from '../../../infrastructure/fake-billing-provider-registry.js';
import { RecordPaymentUseCase } from './record-payment.use-case.js';

describe('RecordPaymentUseCase', () => {
  let subscriptionRepository: InMemorySubscriptionRepository;
  let billingPaymentRepository: InMemoryBillingPaymentRepository;
  let provider: FakeBillingProvider;
  let useCase: RecordPaymentUseCase;

  beforeEach(() => {
    subscriptionRepository = new InMemorySubscriptionRepository();
    billingPaymentRepository = new InMemoryBillingPaymentRepository();
    provider = new FakeBillingProvider();
    const registry = new FakeBillingProviderRegistry(provider);
    const lifecycle = new SubscriptionLifecycleService(
      subscriptionRepository,
      billingPaymentRepository,
      new InMemoryBillingEventRepository(),
      registry,
    );
    useCase = new RecordPaymentUseCase(subscriptionRepository, billingPaymentRepository, registry, lifecycle);
  });

  it('does nothing when no subscription matches the snapshot', async () => {
    const result = await useCase.execute('mercadopago', {
      externalId: 'pay-1',
      subscriptionExternalId: 'pre-unknown',
      providerPaymentId: '99',
      status: 'approved',
      amount: 1490,
      currency: 'PEN',
      paidAt: new Date(),
    });

    expect(result).toBeNull();
  });

  it('upserts the payment and re-syncs the subscription snapshot', async () => {
    const pending = await subscriptionRepository.createPending({
      userId: 'user-1',
      planKey: 'pro',
      amount: 1490,
      currency: 'PEN',
      interval: 'month',
      provider: 'mercadopago',
      trialEndsAt: null,
    });
    if (pending === 'live_exists') throw new Error('unexpected live_exists');
    await subscriptionRepository.attachCheckout(pending.id, 'pre-1', 'https://mp/checkout');
    provider.getSubscription.mockResolvedValue({ externalId: 'pre-1', reference: pending.id, status: 'active', currentPeriodEnd: null });

    const paidAt = new Date();
    await useCase.execute('mercadopago', {
      externalId: 'pay-1',
      subscriptionExternalId: 'pre-1',
      providerPaymentId: '99',
      status: 'approved',
      amount: 1490,
      currency: 'PEN',
      paidAt,
    });

    expect(await billingPaymentRepository.findStatus('mercadopago', 'pay-1')).toBe('approved');
    const [updated] = await subscriptionRepository.findHistory('user-1', 10);
    expect(updated.status).toBe('active');
  });

  it('keeps a locally recorded refund even if the gateway still reports it as approved', async () => {
    const pending = await subscriptionRepository.createPending({
      userId: 'user-1',
      planKey: 'pro',
      amount: 1490,
      currency: 'PEN',
      interval: 'month',
      provider: 'mercadopago',
      trialEndsAt: null,
    });
    if (pending === 'live_exists') throw new Error('unexpected live_exists');
    await subscriptionRepository.attachCheckout(pending.id, 'pre-1', 'https://mp/checkout');
    await billingPaymentRepository.upsert({
      subscriptionId: pending.id,
      provider: 'mercadopago',
      externalId: 'pay-1',
      providerPaymentId: '99',
      status: 'refunded',
      amount: 1490,
      currency: 'PEN',
      paidAt: new Date(),
    });
    provider.getSubscription.mockResolvedValue({ externalId: 'pre-1', reference: pending.id, status: 'active', currentPeriodEnd: null });

    await useCase.execute('mercadopago', {
      externalId: 'pay-1',
      subscriptionExternalId: 'pre-1',
      providerPaymentId: '99',
      status: 'approved',
      amount: 1490,
      currency: 'PEN',
      paidAt: new Date(),
    });

    expect(await billingPaymentRepository.findStatus('mercadopago', 'pay-1')).toBe('refunded');
  });
});
