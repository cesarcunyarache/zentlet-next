import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature } from './signature.js';

const SECRET = 'app-secret';
const sign = (body: string, secret = SECRET) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

describe('verifyWebhookSignature', () => {
  it('accepts a signature computed over the exact raw body with the app secret', () => {
    const body = '{"object":"whatsapp_business_account"}';
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
  });

  it('rejects a tampered body, a signature from another secret, or a missing header', () => {
    const body = '{"object":"whatsapp_business_account"}';
    expect(verifyWebhookSignature(`${body} `, sign(body), SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body, 'other-secret'), SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, 'garbage', SECRET)).toBe(false);
  });

  it('rejects when the app secret is empty', () => {
    const body = '{"object":"whatsapp_business_account"}';
    expect(verifyWebhookSignature(body, sign(body, ''), '')).toBe(false);
  });
});
