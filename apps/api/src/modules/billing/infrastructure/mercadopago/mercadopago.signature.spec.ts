import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { checkSignature, signatureManifest, SIGNATURE_TOLERANCE_MS } from './mercadopago.signature.js';

const SECRET = 'test-secret';
const NOW = 1_790_000_000_000;
const sign = (manifest: string) => createHmac('sha256', SECRET).update(manifest).digest('hex');
const header = (ts: number, v1: string) => `ts=${ts},v1=${v1}`;

const base = { requestId: 'req-1', dataId: 'ABC123', secret: SECRET, now: NOW };
const validHeader = header(NOW, sign(signatureManifest({ dataId: 'ABC123', requestId: 'req-1', ts: String(NOW) })));

describe('signatureManifest', () => {
  it('follows the Mercado Pago template with the id lowercased', () => {
    expect(signatureManifest({ dataId: 'ABC123', requestId: 'req-1', ts: '1' })).toBe('id:abc123;request-id:req-1;ts:1;');
  });

  it('omits missing values', () => {
    expect(signatureManifest({ dataId: null, requestId: null, ts: '1' })).toBe('ts:1;');
  });
});

describe('checkSignature', () => {
  it('accepts a correct signature', () => {
    expect(checkSignature({ ...base, header: validHeader })).toBe('valid');
  });

  it('rejects a tampered signature or one for another resource', () => {
    expect(checkSignature({ ...base, header: header(NOW, '0'.repeat(64)) })).toBe('mismatch');
    expect(checkSignature({ ...base, dataId: 'OTHER', header: validHeader })).toBe('mismatch');
  });

  it('rejects a notification outside the time window', () => {
    expect(checkSignature({ ...base, now: NOW + SIGNATURE_TOLERANCE_MS + 1, header: validHeader })).toBe('stale');
  });

  it('rejects a missing header, a missing secret, or an invalid header', () => {
    expect(checkSignature({ ...base, header: null })).toBe('missing');
    expect(checkSignature({ ...base, secret: '', header: validHeader })).toBe('missing');
    expect(checkSignature({ ...base, header: 'garbage' })).toBe('missing');
  });

  it('accepts a timestamp in seconds', () => {
    const seconds = Math.floor(NOW / 1000);
    const manifest = signatureManifest({ dataId: 'ABC123', requestId: 'req-1', ts: String(seconds) });
    expect(checkSignature({ ...base, header: header(seconds, sign(manifest)) })).toBe('valid');
  });
});
