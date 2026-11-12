import { describe, expect, it } from 'vitest';
import { EmailAlreadyRegisteredError } from '../../../domain/auth.errors.js';
import { InMemoryAccountRepository } from '../../../infrastructure/account/in-memory-account.repository.js';
import { InMemorySessionRepository } from '../../../infrastructure/session/in-memory-session.repository.js';
import { InMemoryUserRepository } from '../../../infrastructure/user/in-memory-user.repository.js';
import { NodePasswordHasher } from '../../../infrastructure/password/node-password-hasher.js';
import { SignUpWithPasswordUseCase } from './sign-up-with-password.use-case.js';

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const accountRepository = new InMemoryAccountRepository();
  const sessionRepository = new InMemorySessionRepository();
  const passwordHasher = new NodePasswordHasher();
  const useCase = new SignUpWithPasswordUseCase(
    userRepository,
    accountRepository,
    sessionRepository,
    passwordHasher,
  );
  return { useCase, userRepository, accountRepository, sessionRepository, passwordHasher };
}

describe('SignUpWithPasswordUseCase', () => {
  it('creates a user, a credential account, and a session', async () => {
    const { useCase, accountRepository, passwordHasher } = buildUseCase();

    const result = await useCase.execute({
      email: 'new-user@example.com',
      password: 'super-secret',
      name: 'New User',
    });

    expect(result.user.email).toBe('new-user@example.com');
    expect(result.session.userId).toBe(result.user.id);

    const credential = await accountRepository.findCredentialByUserId(result.user.id);
    expect(credential?.password).toBeTruthy();
    expect(await passwordHasher.verify(credential?.password ?? '', 'super-secret')).toBe(true);
  });

  it('rejects sign-up when a credential account already exists for the email', async () => {
    const { useCase } = buildUseCase();
    await useCase.execute({ email: 'taken@example.com', password: 'first-password', name: 'First' });

    await expect(
      useCase.execute({ email: 'taken@example.com', password: 'second-password', name: 'Second' }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('rejects sign-up when a user already exists for the email without a credential account (e.g. an Apple-only user), instead of attaching a password to it', async () => {
    const { useCase, userRepository, accountRepository } = buildUseCase();
    const now = new Date();
    const appleOnlyUser = await userRepository.create({
      id: crypto.randomUUID(),
      email: 'apple-only@example.com',
      name: 'Apple Only',
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    });
    await accountRepository.create({
      id: crypto.randomUUID(),
      accountId: 'apple-subject',
      providerId: 'apple',
      userId: appleOnlyUser.id,
      password: null,
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      useCase.execute({ email: 'apple-only@example.com', password: 'attacker-password', name: 'Attacker' }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);

    await expect(accountRepository.findCredentialByUserId(appleOnlyUser.id)).resolves.toBeNull();
  });
});
