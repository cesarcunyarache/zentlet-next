import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '../../../../shared/logger/types.js';
import { BillingProviderError } from '../../domain/billing-provider.js';
import type { WebhookRequest } from '../../domain/billing-provider.js';
import { MercadoPagoProvider } from './mercadopago.provider.js';

const SECRET = 'webhook-secret';
const TOKEN = 'TEST-token';
const fetchMock = vi.fn();
const fakeLogger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return {
    url,
    init,
    headers: init.headers as Record<string, string>,
    body: init.body ? JSON.parse(init.body as string) : undefined,
  };
};

const checkoutInput = {
  subscriptionId: 'sub-1',
  reason: 'Zentlet Pro',
  payerEmail: 'ana@example.com',
  amount: 1490,
  currency: 'PEN',
  interval: 'month' as const,
  firstChargeAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
  returnUrl: 'https://zentlet.app/admin?billing=return',
};

function signedNotification({
  ts,
  dataId = 'PRE-1',
  type = 'subscription_preapproval',
}: {
  ts: string;
  dataId?: string;
  type?: string;
}): WebhookRequest {
  const requestId = 'req-1';
  const v1 = createHmac('sha256', SECRET)
    .update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`)
    .digest('hex');
  return {
    rawBody: JSON.stringify({ id: 777, type, data: { id: dataId } }),
    headers: { signature: `ts=${ts},v1=${v1}`, requestId },
    query: { dataId, type },
  };
}

function provider(): MercadoPagoProvider {
  return new MercadoPagoProvider(fakeLogger);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', TOKEN);
  vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', SECRET);
  vi.stubEnv('MERCADOPAGO_TEST_PAYER_EMAIL', '');
  vi.stubEnv('NODE_ENV', '');
  vi.stubEnv('MERCADOPAGO_API_URL', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('createCheckout', () => {
  it('creates the preapproval with the token, an idempotency key, and the user email', async () => {
    fetchMock.mockResolvedValue(json({ id: 'pre-1', status: 'pending', init_point: 'https://mp/checkout' }));

    const result = await provider().createCheckout(checkoutInput);

    expect(result).toEqual({ externalId: 'pre-1', checkoutUrl: 'https://mp/checkout' });
    const { url, init, headers, body } = lastCall();
    expect(url).toBe('https://api.mercadopago.com/preapproval');
    expect(init.method).toBe('POST');
    expect(headers).toMatchObject({ Authorization: `Bearer ${TOKEN}`, 'X-Idempotency-Key': 'checkout:sub-1' });
    expect(body).toMatchObject({ payer_email: 'ana@example.com', external_reference: 'sub-1', status: 'pending' });
  });

  it('uses the configured test payer in sandbox', async () => {
    vi.stubEnv('MERCADOPAGO_TEST_PAYER_EMAIL', 'test_user_1@testuser.com');
    fetchMock.mockResolvedValue(json({ id: 'pre-1', status: 'pending', init_point: 'https://mp/checkout' }));

    await provider().createCheckout(checkoutInput);

    expect(lastCall().body.payer_email).toBe('test_user_1@testuser.com');
  });

  it('ignores the test payer in production', async () => {
    vi.stubEnv('MERCADOPAGO_TEST_PAYER_EMAIL', 'test_user_1@testuser.com');
    vi.stubEnv('NODE_ENV', 'production');
    fetchMock.mockResolvedValue(json({ id: 'pre-1', status: 'pending', init_point: 'https://mp/checkout' }));

    await provider().createCheckout(checkoutInput);

    expect(lastCall().body.payer_email).toBe('ana@example.com');
  });

  it('a gateway rejection preserves the status and the reason', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Payer is associated with a different site' }, 400));

    const error = await provider()
      .createCheckout(checkoutInput)
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(BillingProviderError);
    expect(error).toMatchObject({ status: 400 });
    expect(error.message).toContain('(400): Payer is associated with a different site');
  });

  it('no checkout url in the response is an error', async () => {
    fetchMock.mockResolvedValue(json({ id: 'pre-1', status: 'pending' }));
    await expect(provider().createCheckout(checkoutInput)).rejects.toThrow('no checkout url');
  });

  it('the API url can only change outside production (e2e tests)', async () => {
    vi.stubEnv('MERCADOPAGO_API_URL', 'http://localhost:4010');
    fetchMock.mockImplementation(() =>
      Promise.resolve(json({ id: 'pre-1', status: 'pending', init_point: 'https://mp/checkout' })),
    );

    await provider().createCheckout(checkoutInput);
    expect(lastCall().url).toBe('http://localhost:4010/preapproval');

    vi.stubEnv('NODE_ENV', 'production');
    await provider().createCheckout(checkoutInput);
    expect(lastCall().url).toBe('https://api.mercadopago.com/preapproval');
  });

  it('fails before calling the gateway when no token is configured', async () => {
    vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', '');
    await expect(provider().createCheckout(checkoutInput)).rejects.toThrow('not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('queries and mutations', () => {
  it('getSubscription translates the preapproval', async () => {
    fetchMock.mockResolvedValue(json({ id: 'pre-1', status: 'authorized', external_reference: 'sub-1' }));

    expect(await provider().getSubscription('pre-1')).toMatchObject({ status: 'active', reference: 'sub-1' });
    expect(lastCall().url).toBe('https://api.mercadopago.com/preapproval/pre-1');
  });

  it('getPayment queries the authorized payment', async () => {
    fetchMock.mockResolvedValue(
      json({
        id: 7001,
        preapproval_id: 'pre-1',
        status: 'processed',
        transaction_amount: 14.9,
        currency_id: 'PEN',
        payment: { id: 99, status: 'approved' },
      }),
    );

    expect(await provider().getPayment('7001')).toMatchObject({ status: 'approved', amount: 1490, providerPaymentId: '99' });
    expect(lastCall().url).toBe('https://api.mercadopago.com/authorized_payments/7001');
  });

  it('cancelSubscription sends the cancelled status', async () => {
    fetchMock.mockResolvedValue(json({ id: 'pre-1', status: 'cancelled' }));

    await provider().cancelSubscription('pre-1');

    expect(lastCall()).toMatchObject({ url: 'https://api.mercadopago.com/preapproval/pre-1', body: { status: 'cancelled' } });
    expect(lastCall().init.method).toBe('PUT');
  });

  it('refundPayment converts cents and sends the idempotency key', async () => {
    fetchMock.mockResolvedValue(json({ id: 1 }));

    await provider().refundPayment({ providerPaymentId: '99', amount: 745, idempotencyKey: 'refund:p1:0' });

    expect(lastCall()).toMatchObject({ url: 'https://api.mercadopago.com/v1/payments/99/refunds', body: { amount: 7.45 } });
    expect(lastCall().headers['X-Idempotency-Key']).toBe('refund:p1:0');
  });
});

describe('parseWebhook', () => {
  const nowSeconds = () => String(Math.floor(Date.now() / 1000));

  it('accepts a real Mercado Pago signature (seconds) and normalizes the notification', () => {
    const notification = provider().parseWebhook(signedNotification({ ts: nowSeconds() }));

    expect(notification).toEqual({
      eventId: 'subscription_preapproval:777',
      type: 'subscription_preapproval',
      resource: 'subscription',
      resourceId: 'PRE-1',
    });
  });

  it('also accepts a millisecond timestamp', () => {
    const request = signedNotification({ ts: String(Date.now()), type: 'subscription_authorized_payment' });
    expect(provider().parseWebhook(request)).toMatchObject({ resource: 'payment' });
  });

  it('a topic we do not handle is ignored', () => {
    const request = signedNotification({ ts: nowSeconds(), type: 'payment' });
    expect(provider().parseWebhook(request)).toMatchObject({ resource: 'ignored' });
  });

  it('rejects a signature from another secret, a stale one, and a non-JSON body', () => {
    const mercadoPago = provider();
    const stale = String(Math.floor(Date.now() / 1000) - 3600);

    vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', 'another-secret');
    expect(mercadoPago.parseWebhook(signedNotification({ ts: nowSeconds() }))).toBeNull();

    vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', SECRET);
    expect(mercadoPago.parseWebhook(signedNotification({ ts: stale }))).toBeNull();

    const valid = signedNotification({ ts: nowSeconds() });
    expect(mercadoPago.parseWebhook({ ...valid, rawBody: 'not-json' })).toBeNull();
  });
});
