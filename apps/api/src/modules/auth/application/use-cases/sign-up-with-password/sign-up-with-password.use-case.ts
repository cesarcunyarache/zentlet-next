import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../../domain/account.repository.js';
import { EmailAlreadyRegisteredError } from '../../../domain/auth.errors.js';
import { PasswordHasher } from '../../../domain/password-hasher.js';
import { SessionRepository } from '../../../domain/session.repository.js';
import { UserRepository } from '../../../domain/user.repository.js';
import { sessionExpiryFrom } from '../../session-ttl.js';
import type { SignUpWithPasswordInput } from './sign-up-with-password.input.js';
import type { SignUpWithPasswordOutput } from './sign-up-with-password.output.js';

const CREDENTIAL_PROVIDER_ID = 'credential';

@Injectable()
export class SignUpWithPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accountRepository: AccountRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: SignUpWithPasswordInput): Promise<SignUpWithPasswordOutput> {
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      const existingCredential = await this.accountRepository.findCredentialByUserId(existingUser.id);
      if (existingCredential) throw new EmailAlreadyRegisteredError(input.email);
    }

    const now = new Date();
    const user =
      existingUser ??
      (await this.userRepository.create({
        id: crypto.randomUUID(),
        email: input.email,
        name: input.name,
        emailVerified: false,
        image: null,
        createdAt: now,
        updatedAt: now,
      }));

    const passwordHash = await this.passwordHasher.hash(input.password);
    await this.accountRepository.create({
      id: crypto.randomUUID(),
      accountId: user.id,
      providerId: CREDENTIAL_PROVIDER_ID,
      userId: user.id,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });

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
}
