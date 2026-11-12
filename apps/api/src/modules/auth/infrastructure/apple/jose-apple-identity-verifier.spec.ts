import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { APPLE_ISSUER, verifyAppleIdentityToken } from './jose-apple-identity-verifier.js';

const AUDIENCE = 'com.zentlet.app';
const KEY_ID = 'test-key';

async function buildLocalJwks() {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = await exportJWK(publicKey);
  jwk.kid = KEY_ID;
  jwk.alg = 'ES256';
  return { jwks: createLocalJWKSet({ keys: [jwk] }), privateKey };
}

type PrivateKey = Awaited<ReturnType<typeof buildLocalJwks>>['privateKey'];

function signToken(privateKey: PrivateKey, claims: Record<string, unknown>, audience = AUDIENCE) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'ES256', kid: KEY_ID })
    .setIssuer(APPLE_ISSUER)
    .setAudience(audience)
    .setExpirationTime('5m')
    .sign(privateKey);
}

describe('verifyAppleIdentityToken', () => {
  it('resolves the subject and email for a valid token', async () => {
    const { jwks, privateKey } = await buildLocalJwks();
    const token = await signToken(privateKey, { sub: 'apple-subject', email: 'user@example.com' });

    const identity = await verifyAppleIdentityToken(token, { jwks, issuer: APPLE_ISSUER, audience: AUDIENCE });

    expect(identity).toEqual({ subject: 'apple-subject', email: 'user@example.com' });
  });

  it('resolves a null email when the token omits it (subsequent sign-ins)', async () => {
    const { jwks, privateKey } = await buildLocalJwks();
    const token = await signToken(privateKey, { sub: 'apple-subject' });

    const identity = await verifyAppleIdentityToken(token, { jwks, issuer: APPLE_ISSUER, audience: AUDIENCE });

    expect(identity).toEqual({ subject: 'apple-subject', email: null });
  });

  it('rejects a token issued for a different audience (bundle id)', async () => {
    const { jwks, privateKey } = await buildLocalJwks();
    const token = await signToken(privateKey, { sub: 'apple-subject', email: 'user@example.com' }, 'com.other-app');

    await expect(verifyAppleIdentityToken(token, { jwks, issuer: APPLE_ISSUER, audience: AUDIENCE })).rejects.toThrow();
  });

  it('rejects a token missing the subject claim', async () => {
    const { jwks, privateKey } = await buildLocalJwks();
    const token = await signToken(privateKey, { email: 'user@example.com' });

    await expect(
      verifyAppleIdentityToken(token, { jwks, issuer: APPLE_ISSUER, audience: AUDIENCE }),
    ).rejects.toThrow('subject');
  });
});
