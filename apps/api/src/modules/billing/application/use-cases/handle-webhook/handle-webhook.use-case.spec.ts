import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '../../../../../shared/logger/domain/logger.js';
import { BillingProviderError, type WebhookNotification, type WebhookRequest } from '../../../domain/billing-provider.js';
import { InMemoryBillingEventRepository } from '../../../infrastructure/in-memory-billing-event.repository.js';
import { InMemoryBillingPaymentRepository } from '../../../infrastructure/in-memory-billing-payment.repository.js';
import { InMemorySubscriptionRepository } from '../../../infrastructure/in-memory-subscription.repository.js';
import { SubscriptionLifecycleService } from '../../services/subscription-lifecycle.service.js';
import { FakeBillingProvider } from '../../../infrastructure/fake-billing-provider.js';
import { FakeBillingProviderRegistry } from '../../../infrastructure/fake-billing-provider-registry.js';
import { RecordPaymentUseCase } from '../record-payment/record-payment.use-case.js';
import { HandleWebhookUseCase } from './handle-webhook.use-case.js';

const request: WebhookRequest = { rawBody: '{}', headers: { signature: 'sig', requestId: 'req-1' }, query: { dataId: 'PRE-1', type: 'subscription_preapproval' } };

function subscriptionNotification(resourceId = 'PRE-1'): WebhookNotification {
  return { eventId: `subscription_preapproval:${resourceId}`, type: 'subscription_preapproval', resource: 'subscription', resourceId };
}

function paymentNotification(resourceId = 'PAY-1'): WebhookNotification {
  return { eventId: `subscription_authorized_payment:${resourceId}`, type: 'subscription_authorized_payment', resource: 'payment', resourceId };
}

// A plain object, not the `Logger` abstract class: reading `logger.warn` to
// assert on it would otherwise trip oxlint's unbound-method check, which
// treats abstract-class methods specially.
function createFakeLogger() {
  return {
    debug: vi.fn<Logger['debug']>(),
    info: vi.fn<Logger['info']>(),
    warn: vi.fn<Logger['warn']>(),
    error: vi.fn<Logger['error']>(),
  };
}

describe('HandleWebhookUseCase', () => {
  let subscriptionRepository: InMemorySubscriptionRepository;
  let billingPaymentRepository: InMemoryBillingPaymentRepository;
  let billingEventRepository: InMemoryBillingEventRepository;
  let provider: FakeBillingProvider;
  let registry: FakeBillingProviderRegistry;
  let logger: ReturnType<typeof createFakeLogger>;
  let useCase: HandleWebhookUseCase;

  beforeEach(() => {
    subscriptionRepository = new InMemorySubscriptionRepository();
    billingPaymentRepository = new InMemoryBillingPaymentRepository();
    billingEventRepository = new InMemoryBillingEventRepository();
    provider = new FakeBillingProvider();
    registry = new FakeBillingProviderRegistry(provider);
    logger = createFakeLogger();
    const lifecycle = new SubscriptionLifecycleService(subscriptionRepository, billingPaymentRepository, billingEventRepository, registry);
    const recordPayment = new RecordPaymentUseCase(subscriptionRepository, billingPaymentRepository, registry, lifecycle);
    useCase = new HandleWebhookUseCase(registry, billingEventRepository, subscriptionRepository, lifecycle, recordPayment, logger);
  });

  it('rejects an unknown provider', async () => {
    expect(await useCase.execute('stripe', request)).toBe('invalid');
  });

  it('rejects a request the provider cannot parse (bad signature)', async () => {
    provider.parseWebhook.mockReturnValue(null);
    expect(await useCase.execute('mercadopago', request)).toBe('invalid');
  });

  it('is idempotent on a redelivered event', async () => {
    provider.parseWebhook.mockReturnValue(subscriptionNotification());
    provider.getSubscription.mockResolvedValue({ externalId: 'PRE-1', reference: null, status: 'active', currentPeriodEnd: null });

    expect(await useCase.execute('mercadopago', request)).toBe('processed');
    expect(await useCase.execute('mercadopago', request)).toBe('duplicate');
    expect(provider.getSubscription).toHaveBeenCalledTimes(1);
  });

  it('ignores a topic we do not subscribe to', async () => {
    provider.parseWebhook.mockReturnValue({ eventId: 'payment:1', type: 'payment', resource: 'ignored', resourceId: '1' });

    expect(await useCase.execute('mercadopago', request)).toBe('ignored');
    expect(provider.getSubscription).not.toHaveBeenCalled();
  });

  it('applies the subscription snapshot when the resource matches', async () => {
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
    await subscriptionRepository.attachCheckout(pending.id, 'PRE-1', 'https://mp/checkout');
    provider.parseWebhook.mockReturnValue(subscriptionNotification());
    provider.getSubscription.mockResolvedValue({ externalId: 'PRE-1', reference: pending.id, status: 'active', currentPeriodEnd: null });

    expect(await useCase.execute('mercadopago', request)).toBe('processed');

    const [updated] = await subscriptionRepository.findHistory('user-1', 10);
    expect(updated.status).toBe('active');
  });

  it('ignores a snapshot that references another subscription', async () => {
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
    await subscriptionRepository.attachCheckout(pending.id, 'PRE-1', 'https://mp/checkout');
    provider.parseWebhook.mockReturnValue(subscriptionNotification());
    provider.getSubscription.mockResolvedValue({ externalId: 'PRE-1', reference: 'someone-elses-subscription', status: 'active', currentPeriodEnd: null });

    expect(await useCase.execute('mercadopago', request)).toBe('processed');
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ subscriptionId: pending.id }), 'billing.webhook_reference_mismatch');

    const [untouched] = await subscriptionRepository.findHistory('user-1', 10);
    expect(untouched.status).toBe('pending');
  });

  it('records a payment when the resource is a charged installment', async () => {
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
    await subscriptionRepository.attachCheckout(pending.id, 'PRE-1', 'https://mp/checkout');
    provider.parseWebhook.mockReturnValue(paymentNotification());
    provider.getPayment.mockResolvedValue({
      externalId: 'PAY-1',
      subscriptionExternalId: 'PRE-1',
      providerPaymentId: '99',
      status: 'approved',
      amount: 1490,
      currency: 'PEN',
      paidAt: new Date(),
    });
    provider.getSubscription.mockResolvedValue({ externalId: 'PRE-1', reference: pending.id, status: 'active', currentPeriodEnd: null });

    expect(await useCase.execute('mercadopago', request)).toBe('processed');
    expect(await billingPaymentRepository.findStatus('mercadopago', 'PAY-1')).toBe('approved');
  });

  it('treats a 404 from the gateway as unmatched instead of failing', async () => {
    provider.parseWebhook.mockReturnValue(subscriptionNotification());
    provider.getSubscription.mockRejectedValue(new BillingProviderError('not found', 404));

    expect(await useCase.execute('mercadopago', request)).toBe('processed');
  });

  it('propagates an unexpected gateway failure', async () => {
    provider.parseWebhook.mockReturnValue(subscriptionNotification());
    provider.getSubscription.mockRejectedValue(new BillingProviderError('gateway down', 500));

    await expect(useCase.execute('mercadopago', request)).rejects.toThrow('gateway down');
  });
});
