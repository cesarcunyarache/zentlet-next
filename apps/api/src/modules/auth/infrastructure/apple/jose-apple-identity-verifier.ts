import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { Injectable } from '@nestjs/common';
import { AppleIdentityVerifier, type AppleIdentity } from '../../domain/apple/apple-identity-verifier.js';

export const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function verifyAppleIdentityToken(
  identityToken: string,
  options: { jwks: JWTVerifyGetKey; issuer: string; audience: string },
): Promise<AppleIdentity> {
  const { payload } = await jwtVerify(identityToken, options.jwks, {
    issuer: options.issuer,
    audience: options.audience,
  });

  if (!payload.sub) throw new Error('Apple identity token is missing a subject claim');

  // Apple only includes `email` in the identity token on the user's first
  // authorization for this app; subsequent sign-ins omit it entirely.
  const email = typeof payload.email === 'string' ? payload.email : null;

  return { subject: payload.sub, email };
}

@Injectable()
export class JoseAppleIdentityVerifier extends AppleIdentityVerifier {
  private readonly jwks = createRemoteJWKSet(new URL(APPLE_JWKS_URL));
  // Fails fast at startup rather than silently skipping the audience check
  // (jose treats an undefined `audience` as "don't validate `aud` at all").
  private readonly audience = requireEnv('APPLE_BUNDLE_ID');

  async verify(identityToken: string): Promise<AppleIdentity> {
    return verifyAppleIdentityToken(identityToken, { jwks: this.jwks, issuer: APPLE_ISSUER, audience: this.audience });
  }
}
