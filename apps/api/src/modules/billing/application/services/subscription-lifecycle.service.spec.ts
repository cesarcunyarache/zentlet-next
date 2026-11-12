import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryBillingEventRepository } from '../../infrastructure/in-memory-billing-event.repository.js';
import { InMemoryBillingPaymentRepository } from '../../infrastructure/in-memory-billing-payment.repository.js';
import { InMemorySubscriptionRepository } from '../../infrastructure/in-memory-subscription.repository.js';
import { FakeBillingProvider, FakeBillingProviderRegistry } from '../use-cases/billing-test-doubles.js';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service.js';

describe('SubscriptionLifecycleService', () => {
  let subscriptionRepository: InMemorySubscriptionRepository;
  let billingEventRepository: InMemoryBillingEventRepository;
  let provider: FakeBillingProvider;
  let service: SubscriptionLifecycleService;

  beforeEach(() => {
    subscriptionRepository = new InMemorySubscriptionRepository();
    billingEventRepository = new InMemoryBillingEventRepository();
    provider = new FakeBillingProvider();
    const registry = new FakeBillingProviderRegistry(provider);
    service = new SubscriptionLifecycleService(subscriptionRepository, new InMemoryBillingPaymentRepository(), billingEventRepository, registry);
  });

  async function createPending() {
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
    return created;
  }

  it('records a status_changed event only when the resolved status actually changes', async () => {
    const pending = await createPending();
    await subscriptionRepository.attachCheckout(pending.id, 'pre-1', 'https://mp/checkout');

    await service.applySnapshot(pending, { externalId: 'pre-1', reference: pending.id, status: 'active', currentPeriodEnd: null });
    expect(billingEventRepository.recorded).toContainEqual(expect.objectContaining({ type: 'subscription.status_changed', data: { from: 'pending', to: 'active' } }));

    billingEventRepository.recorded.length = 0;
    const [active] = await subscriptionRepository.findHistory('user-1', 10);
    await service.applySnapshot(active, { externalId: 'pre-1', reference: pending.id, status: 'active', currentPeriodEnd: null });
    expect(billingEventRepository.recorded).toHaveLength(0);
  });

  it('stamps canceledAt the first time a snapshot reports cancellation', async () => {
    const pending = await createPending();
    await subscriptionRepository.attachCheckout(pending.id, 'pre-1', 'https://mp/checkout');

    const updated = await service.applySnapshot(pending, { externalId: 'pre-1', reference: pending.id, status: 'canceled', currentPeriodEnd: null });

    expect(updated.status).toBe('canceled');
    expect(updated.canceledAt).not.toBeNull();
  });

  it('sync is a no-op for a subscription with no external id yet', async () => {
    const pending = await createPending();

    const result = await service.sync(pending);

    expect(result).toEqual(pending);
    expect(provider.getSubscription).not.toHaveBeenCalled();
  });

  it('cancel on a pending subscription abandons it instead of calling the gateway', async () => {
    const pending = await createPending();

    await service.cancel(pending, { source: 'user' });

    const [abandoned] = await subscriptionRepository.findHistory('user-1', 10);
    expect(abandoned).toMatchObject({ status: 'canceled', trialEndsAt: null });
    expect(provider.cancelSubscription).not.toHaveBeenCalled();
  });

  it('cancel on an active subscription keeps access until the current period ends', async () => {
    const pending = await createPending();
    const currentPeriodEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    await subscriptionRepository.applyProviderState(pending.id, { status: 'active', externalId: 'pre-1', currentPeriodEnd, canceledAt: null });
    const [active] = await subscriptionRepository.findHistory('user-1', 10);

    await service.cancel(active, { source: 'user' });

    expect(provider.cancelSubscription).toHaveBeenCalledWith('pre-1');
    const [canceled] = await subscriptionRepository.findHistory('user-1', 10);
    expect(canceled).toMatchObject({ status: 'canceled', currentPeriodEnd });
  });
});
