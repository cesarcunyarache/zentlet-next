import { describe, expect, it } from 'vitest';
import { isTrustedRule, normalizeAddress, normalizeSenderPattern, senderVerdict, shouldAutoBlock } from './sender.js';

const rule = (overrides: Partial<{ address: string; status: string; origin: string; acceptedCount: number; dismissedCount: number }> = {}) => ({
  address: 'alerts@shop.pe',
  status: 'trusted',
  origin: 'learned',
  acceptedCount: 0,
  dismissedCount: 0,
  ...overrides,
});

describe('normalizeAddress', () => {
  it('extracts and lowercases the email address from free text', () => {
    expect(normalizeAddress('  Alerts@Shop.PE ')).toBe('alerts@shop.pe');
    expect(normalizeAddress('BCP <notificaciones@notificacionesbcp.com.pe>')).toBe('notificaciones@notificacionesbcp.com.pe');
    expect(normalizeAddress('no es correo')).toBe('');
  });
});

describe('normalizeSenderPattern', () => {
  it('accepts a bare domain as a @domain pattern', () => {
    expect(normalizeSenderPattern('shop.pe')).toBe('@shop.pe');
    expect(normalizeSenderPattern('@shop.pe')).toBe('@shop.pe');
  });

  it('accepts a single address', () => {
    expect(normalizeSenderPattern('Alerts@Shop.PE')).toBe('alerts@shop.pe');
  });
});

describe('senderVerdict', () => {
  it('a known bank domain is known even without a rule', () => {
    expect(senderVerdict('notificaciones@notificacionesbcp.com.pe', [])).toBe('known');
  });

  it('a blocked rule always wins, even over a known bank', () => {
    expect(senderVerdict('alerts@shop.pe', [rule({ status: 'blocked' })])).toBe('blocked');
  });

  it('a manually trusted rule is trusted', () => {
    expect(senderVerdict('alerts@shop.pe', [rule({ origin: 'manual' })])).toBe('trusted');
  });

  it('a learned rule with no accepted email yet is unknown', () => {
    expect(senderVerdict('alerts@shop.pe', [rule({ origin: 'learned', acceptedCount: 0 })])).toBe('unknown');
  });

  it('a learned rule becomes trusted once at least one email was accepted', () => {
    expect(senderVerdict('alerts@shop.pe', [rule({ origin: 'learned', acceptedCount: 1 })])).toBe('trusted');
  });

  it('with no rule and no known bank it is unknown', () => {
    expect(senderVerdict('alerts@shop.pe', [])).toBe('unknown');
  });
});

describe('isTrustedRule', () => {
  it('requires trusted status and either manual origin or at least one acceptance', () => {
    expect(isTrustedRule(rule({ origin: 'manual', acceptedCount: 0 }))).toBe(true);
    expect(isTrustedRule(rule({ origin: 'learned', acceptedCount: 0 }))).toBe(false);
    expect(isTrustedRule(rule({ status: 'blocked', origin: 'manual' }))).toBe(false);
  });
});

describe('shouldAutoBlock', () => {
  it('blocks a learned sender after 3 dismissals with zero acceptances', () => {
    expect(shouldAutoBlock('alerts@shop.pe', { origin: 'learned', acceptedCount: 0, dismissedCount: 3 })).toBe(true);
  });

  it('never blocks a manually added sender', () => {
    expect(shouldAutoBlock('alerts@shop.pe', { origin: 'manual', acceptedCount: 0, dismissedCount: 10 })).toBe(false);
  });

  it('never blocks a known bank domain', () => {
    expect(shouldAutoBlock('notificaciones@notificacionesbcp.com.pe', { origin: 'learned', acceptedCount: 0, dismissedCount: 10 })).toBe(false);
  });

  it('does not block once at least one email from that sender was accepted', () => {
    expect(shouldAutoBlock('alerts@shop.pe', { origin: 'learned', acceptedCount: 1, dismissedCount: 10 })).toBe(false);
  });
});
