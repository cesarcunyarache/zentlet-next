import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Injectable } from '@nestjs/common';
import { AppleIdentityVerifier, type AppleIdentity } from '../domain/apple-identity-verifier.js';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

@Injectable()
export class JoseAppleIdentityVerifier extends AppleIdentityVerifier {
  private readonly jwks = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

  async verify(identityToken: string): Promise<AppleIdentity> {
    const { payload } = await jwtVerify(identityToken, this.jwks, {
      issuer: APPLE_ISSUER,
      audience: process.env.APPLE_BUNDLE_ID,
    });

    if (!payload.sub) throw new Error('Apple identity token is missing a subject claim');

    // Apple only includes `email` in the identity token on the user's first
    // authorization for this app; subsequent sign-ins omit it entirely.
    const email = typeof payload.email === 'string' ? payload.email : null;

    return { subject: payload.sub, email };
  }
}
