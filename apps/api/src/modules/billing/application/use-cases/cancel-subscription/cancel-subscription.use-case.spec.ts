import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryBillingEventRepository } from '../../../infrastructure/in-memory-billing-event.repository.js';
import { InMemoryBillingPaymentRepository } from '../../../infrastructure/in-memory-billing-payment.repository.js';
import { InMemorySubscriptionRepository } from '../../../infrastructure/in-memory-subscription.repository.js';
import { SubscriptionLifecycleService } from '../../services/subscription-lifecycle.service.js';
import { FakeBillingProvider } from '../../../infrastructure/fake-billing-provider.js';
import { FakeBillingProviderRegistry } from '../../../infrastructure/fake-billing-provider-registry.js';
import { CancelSubscriptionUseCase } from './cancel-subscription.use-case.js';

describe('CancelSubscriptionUseCase', () => {
  let subscriptionRepository: InMemorySubscriptionRepository;
  let billingEventRepository: InMemoryBillingEventRepository;
  let provider: FakeBillingProvider;
  let useCase: CancelSubscriptionUseCase;

  beforeEach(() => {
    subscriptionRepository = new InMemorySubscriptionRepository();
    billingEventRepository = new InMemoryBillingEventRepository();
    provider = new FakeBillingProvider();
    const registry = new FakeBillingProviderRegistry(provider);
    const lifecycle = new SubscriptionLifecycleService(
      subscriptionRepository,
      new InMemoryBillingPaymentRepository(),
      billingEventRepository,
      registry,
    );
    useCase = new CancelSubscriptionUseCase(subscriptionRepository, lifecycle);
  });

  it('is a no-op when the user has no live subscription', async () => {
    expect(await useCase.execute('user-1')).toBe(false);
    expect(provider.cancelSubscription).not.toHaveBeenCalled();
  });

  it('cancels at the gateway and keeps access until the trial ends', async () => {
    const trialEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const pending = await subscriptionRepository.createPending({
      userId: 'user-1',
      planKey: 'pro',
      amount: 1490,
      currency: 'PEN',
      interval: 'month',
      provider: 'mercadopago',
      trialEndsAt,
    });
    if (pending === 'live_exists') throw new Error('unexpected live_exists');
    await subscriptionRepository.applyProviderState(pending.id, {
      status: 'trialing',
      externalId: 'pre-1',
      currentPeriodEnd: null,
      canceledAt: null,
    });

    expect(await useCase.execute('user-1')).toBe(true);

    expect(provider.cancelSubscription).toHaveBeenCalledWith('pre-1');
    const [canceled] = await subscriptionRepository.findHistory('user-1', 10);
    expect(canceled).toMatchObject({ status: 'canceled', currentPeriodEnd: trialEndsAt });
    expect(billingEventRepository.recorded).toContainEqual(
      expect.objectContaining({ type: 'subscription.canceled', subscriptionId: pending.id }),
    );
  });

  it('abandons a pending checkout without consuming the trial', async () => {
    await subscriptionRepository.createPending({
      userId: 'user-1',
      planKey: 'pro',
      amount: 1490,
      currency: 'PEN',
      interval: 'month',
      provider: 'mercadopago',
      trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    });

    expect(await useCase.execute('user-1')).toBe(true);

    const [abandoned] = await subscriptionRepository.findHistory('user-1', 10);
    expect(abandoned).toMatchObject({ status: 'canceled', trialEndsAt: null });
    expect(provider.cancelSubscription).not.toHaveBeenCalled();
  });
});
