import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../../domain/account/account.repository.js';
import { InvalidCredentialsError } from '../../../domain/auth.errors.js';
import { PasswordHasher } from '../../../domain/password/password-hasher.js';
import { SessionRepository } from '../../../domain/session/session.repository.js';
import { UserRepository } from '../../../domain/user/user.repository.js';
import { sessionExpiryFrom } from '../../session-ttl.js';
import type { SignInWithPasswordInput } from './sign-in-with-password.input.js';
import type { SignInWithPasswordOutput } from './sign-in-with-password.output.js';

@Injectable()
export class SignInWithPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accountRepository: AccountRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: SignInWithPasswordInput): Promise<SignInWithPasswordOutput> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) throw new InvalidCredentialsError();

    const credential = await this.accountRepository.findCredentialByUserId(user.id);
    if (!credential?.password) throw new InvalidCredentialsError();

    const isValidPassword = await this.passwordHasher.verify(credential.password, input.password);
    if (!isValidPassword) throw new InvalidCredentialsError();

    const now = new Date();
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
