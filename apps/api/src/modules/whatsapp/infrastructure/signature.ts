import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_PREFIX = 'sha256=';

// Meta's webhook signing scheme: HMAC-SHA256 of the exact raw request body
// with the app secret, sent as `X-Hub-Signature-256: sha256=<hex>`.
// `timingSafeEqual` avoids leaking the secret through response-time timing.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader?.startsWith(SIGNATURE_PREFIX) || !appSecret) return false;

  const expectedHex = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const expected = Buffer.from(`${SIGNATURE_PREFIX}${expectedHex}`);
  const given = Buffer.from(signatureHeader);

  return given.length === expected.length && timingSafeEqual(given, expected);
}
