import { describe, expect, it } from 'vitest';
import { BillingProviderError } from '../../domain/billing-provider.js';
import { checkoutBody, fromCents, toCents, toPaymentSnapshot, toSubscriptionSnapshot } from './mercadopago.mapper.js';

describe('toCents / fromCents', () => {
  it('round-trips between the provider\'s decimal units and cents', () => {
    expect(toCents(14.9)).toBe(1490);
    expect(fromCents(1490)).toBe(14.9);
  });
});

describe('checkoutBody', () => {
  const input = {
    subscriptionId: 'sub-1',
    reason: 'Zentlet Pro',
    payerEmail: 'ana@example.com',
    amount: 1490,
    currency: 'PEN',
    interval: 'month' as const,
    firstChargeAt: new Date('2026-11-01T00:00:00Z'),
    returnUrl: 'https://zentlet.app/admin?billing=return',
  };

  it('defers start_date when the first charge is far enough in the future', () => {
    const body = checkoutBody(input, new Date('2026-10-01T00:00:00Z'));
    expect(body).toMatchObject({
      reason: 'Zentlet Pro',
      external_reference: 'sub-1',
      payer_email: 'ana@example.com',
      status: 'pending',
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: 14.9, currency_id: 'PEN' },
    });
    expect(body.auto_recurring.start_date).toBe(input.firstChargeAt.toISOString());
  });

  it('omits start_date when the first charge is immediate', () => {
    const body = checkoutBody({ ...input, firstChargeAt: new Date('2026-10-01T00:00:10Z') }, new Date('2026-10-01T00:00:00Z'));
    expect(body.auto_recurring.start_date).toBeUndefined();
  });

  it('uses a yearly frequency for the year interval', () => {
    const body = checkoutBody({ ...input, interval: 'year' }, new Date('2026-10-01T00:00:00Z'));
    expect(body.auto_recurring).toMatchObject({ frequency: 12, frequency_type: 'months' });
  });
});

describe('toSubscriptionSnapshot', () => {
  it('maps every known preapproval status', () => {
    expect(toSubscriptionSnapshot({ id: 'p1', status: 'pending' })).toMatchObject({ status: 'pending' });
    expect(toSubscriptionSnapshot({ id: 'p1', status: 'authorized' })).toMatchObject({ status: 'active' });
    expect(toSubscriptionSnapshot({ id: 'p1', status: 'paused' })).toMatchObject({ status: 'past_due' });
    expect(toSubscriptionSnapshot({ id: 'p1', status: 'cancelled' })).toMatchObject({ status: 'canceled' });
    expect(toSubscriptionSnapshot({ id: 'p1', status: 'finished' })).toMatchObject({ status: 'canceled' });
  });

  it('carries the external reference and the next payment date', () => {
    expect(
      toSubscriptionSnapshot({ id: 'p1', status: 'authorized', external_reference: 'sub-1', next_payment_date: '2026-11-01T00:00:00Z' }),
    ).toEqual({ externalId: 'p1', reference: 'sub-1', status: 'active', currentPeriodEnd: new Date('2026-11-01T00:00:00Z') });
  });

  it('refuses to guess an unknown status', () => {
    expect(() => toSubscriptionSnapshot({ id: 'p1', status: 'weird' })).toThrow(BillingProviderError);
  });
});

describe('toPaymentSnapshot', () => {
  const base = { id: 7001, preapproval_id: 'pre-1', status: 'processed', transaction_amount: 14.9, currency_id: 'PEN' };

  it('maps the approved payment status and converts to cents', () => {
    const snapshot = toPaymentSnapshot({ ...base, payment: { id: 99, status: 'approved' }, debit_date: '2026-10-15T00:00:00Z' });
    expect(snapshot).toMatchObject({ status: 'approved', amount: 1490, providerPaymentId: '99', currency: 'PEN' });
    expect(snapshot.paidAt).toEqual(new Date('2026-10-15T00:00:00Z'));
  });

  it('only sets paidAt when the payment is approved', () => {
    const snapshot = toPaymentSnapshot({ ...base, payment: { id: 99, status: 'rejected' } });
    expect(snapshot).toMatchObject({ status: 'failed' });
    expect(snapshot.paidAt).toBeNull();
  });

  it('falls back to the authorized-payment status when there is no payment yet', () => {
    expect(toPaymentSnapshot({ ...base, status: 'recycling' })).toMatchObject({ status: 'failed' });
    expect(toPaymentSnapshot({ ...base, status: 'scheduled' })).toMatchObject({ status: 'pending' });
  });
});
