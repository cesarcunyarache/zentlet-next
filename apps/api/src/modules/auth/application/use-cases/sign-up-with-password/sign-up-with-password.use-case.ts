import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../../domain/account/account.repository.js';
import { EmailAlreadyRegisteredError } from '../../../domain/auth.errors.js';
import { PasswordHasher } from '../../../domain/password/password-hasher.js';
import { SessionRepository } from '../../../domain/session/session.repository.js';
import { UserRepository } from '../../../domain/user/user.repository.js';
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
    // An existing user (e.g. created via Apple sign-in) must never get a
    // password attached without proving ownership of the email — otherwise
    // anyone who knows that email can take over the account. Always create a
    // brand-new user for sign-up; deliberate linking is a separate, verified feature.
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) throw new EmailAlreadyRegisteredError(input.email);

    const now = new Date();
    const user = await this.userRepository.create({
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      emailVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
    });

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
