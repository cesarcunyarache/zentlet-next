import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../../domain/account.repository.js';
import { AppleIdentityVerifier } from '../../../domain/apple-identity-verifier.js';
import { SessionRepository } from '../../../domain/session.repository.js';
import { UserRepository } from '../../../domain/user.repository.js';
import { sessionExpiryFrom } from '../../session-ttl.js';
import type { SignInWithAppleInput } from './sign-in-with-apple.input.js';
import type { SignInWithAppleOutput } from './sign-in-with-apple.output.js';

const APPLE_PROVIDER_ID = 'apple';

@Injectable()
export class SignInWithAppleUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accountRepository: AccountRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly appleIdentityVerifier: AppleIdentityVerifier,
  ) {}

  async execute(input: SignInWithAppleInput): Promise<SignInWithAppleOutput> {
    const identity = await this.appleIdentityVerifier.verify(input.identityToken);

    const existingAccount = await this.accountRepository.findByProvider(APPLE_PROVIDER_ID, identity.subject);
    const now = new Date();

    const user = existingAccount
      ? await this.userRepository.findById(existingAccount.userId)
      : await this.createAppleUser(identity.subject, identity.email, now);

    if (!user) throw new Error('Apple account references a user that no longer exists');

    if (!existingAccount) {
      await this.accountRepository.create({
        id: crypto.randomUUID(),
        accountId: identity.subject,
        providerId: APPLE_PROVIDER_ID,
        userId: user.id,
        password: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    const session = await this.sessionRepository.create({
      id: crypto.randomUUID(),
      token: crypto.randomUUID(),
      userId: user.id,
      expiresAt: sessionExpiryFrom(now),
      createdAt: now,
      ipAddress: null,
      userAgent: null,
    });

    return { user, session };
  }

  // Apple only sends `email` on the very first authorization for this app; a
  // returning user whose email we never captured still needs a usable name.
  private async createAppleUser(subject: string, email: string | null, now: Date) {
    return this.userRepository.create({
      id: crypto.randomUUID(),
      email: email ?? `${subject}@appleid.privaterelay.invalid`,
      name: email ?? 'Apple User',
      emailVerified: email !== null,
      image: null,
      createdAt: now,
      updatedAt: now,
    });
  }
}
