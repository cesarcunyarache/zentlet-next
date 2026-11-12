import { Injectable } from '@nestjs/common';
import { AppleIdentityVerifier, type AppleIdentity } from '../../domain/apple/apple-identity-verifier.js';

/** Test double: resolves `verify` with pre-programmed identities instead of calling Apple. */
@Injectable()
export class FakeAppleIdentityVerifier extends AppleIdentityVerifier {
  private identity: AppleIdentity | null = null;

  willResolveWith(identity: AppleIdentity): void {
    this.identity = identity;
  }

  async verify(): Promise<AppleIdentity> {
    if (!this.identity) throw new Error('FakeAppleIdentityVerifier has no identity configured');
    return this.identity;
  }
}
