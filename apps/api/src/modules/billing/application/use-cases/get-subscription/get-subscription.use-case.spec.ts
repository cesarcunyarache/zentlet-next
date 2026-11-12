import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryBillingEventRepository } from '../../../infrastructure/in-memory-billing-event.repository.js';
import { InMemoryBillingPaymentRepository } from '../../../infrastructure/in-memory-billing-payment.repository.js';
import { InMemorySubscriptionRepository } from '../../../infrastructure/in-memory-subscription.repository.js';
import { SubscriptionLifecycleService } from '../../services/subscription-lifecycle.service.js';
import { FakeBillingProvider, FakeBillingProviderRegistry } from '../billing-test-doubles.js';
import { GetSubscriptionUseCase } from './get-subscription.use-case.js';

describe('GetSubscriptionUseCase', () => {
  let subscriptionRepository: InMemorySubscriptionRepository;
  let provider: FakeBillingProvider;
  let useCase: GetSubscriptionUseCase;

  beforeEach(() => {
    subscriptionRepository = new InMemorySubscriptionRepository();
    provider = new FakeBillingProvider();
    const registry = new FakeBillingProviderRegistry(provider);
    const lifecycle = new SubscriptionLifecycleService(
      subscriptionRepository,
      new InMemoryBillingPaymentRepository(),
      new InMemoryBillingEventRepository(),
      registry,
    );
    useCase = new GetSubscriptionUseCase(subscriptionRepository, lifecycle);
  });

  it('returns null when the user has no live subscription', async () => {
    expect(await useCase.execute({ userId: 'user-1' })).toBeNull();
  });

  it('returns the stored subscription without syncing by default', async () => {
    await subscriptionRepository.createPending({
      userId: 'user-1',
      planKey: 'pro',
      amount: 1490,
      currency: 'PEN',
      interval: 'month',
      provider: 'mercadopago',
      trialEndsAt: null,
    });

    const subscription = await useCase.execute({ userId: 'user-1' });

    expect(subscription).toMatchObject({ status: 'pending' });
    expect(provider.getSubscription).not.toHaveBeenCalled();
  });

  it('re-fetches the provider snapshot when sync is requested', async () => {
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

    const subscription = await useCase.execute({ userId: 'user-1', sync: true });

    expect(subscription).toMatchObject({ status: 'active' });
    expect(provider.getSubscription).toHaveBeenCalledWith('pre-1');
  });
});
