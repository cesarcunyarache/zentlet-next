import { describe, expect, it } from 'vitest';
import { InMemoryAccountRepository } from '../../../infrastructure/in-memory-account.repository.js';
import { InMemorySessionRepository } from '../../../infrastructure/in-memory-session.repository.js';
import { InMemoryUserRepository } from '../../../infrastructure/in-memory-user.repository.js';
import { FakeAppleIdentityVerifier } from '../../../infrastructure/fake-apple-identity-verifier.js';
import { SignInWithAppleUseCase } from './sign-in-with-apple.use-case.js';

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const accountRepository = new InMemoryAccountRepository();
  const sessionRepository = new InMemorySessionRepository();
  const appleIdentityVerifier = new FakeAppleIdentityVerifier();
  const useCase = new SignInWithAppleUseCase(userRepository, accountRepository, sessionRepository, appleIdentityVerifier);
  return { useCase, userRepository, accountRepository, appleIdentityVerifier };
}

describe('SignInWithAppleUseCase', () => {
  it('creates a new user and apple account on first sign-in', async () => {
    const { useCase, accountRepository, appleIdentityVerifier } = buildUseCase();
    appleIdentityVerifier.willResolveWith({ subject: 'apple-subject-1', email: 'apple-user@example.com' });

    const result = await useCase.execute({ identityToken: 'token' });

    expect(result.user.email).toBe('apple-user@example.com');
    expect(result.session.userId).toBe(result.user.id);
    const account = await accountRepository.findByProvider('apple', 'apple-subject-1');
    expect(account?.userId).toBe(result.user.id);
  });

  it('reuses the existing user and account on a repeat sign-in', async () => {
    const { useCase, appleIdentityVerifier } = buildUseCase();
    appleIdentityVerifier.willResolveWith({ subject: 'apple-subject-2', email: 'apple-user-2@example.com' });
    const first = await useCase.execute({ identityToken: 'token-1' });

    // Apple omits `email` after the first authorization.
    appleIdentityVerifier.willResolveWith({ subject: 'apple-subject-2', email: null });
    const second = await useCase.execute({ identityToken: 'token-2' });

    expect(second.user.id).toBe(first.user.id);
    expect(second.session.id).not.toBe(first.session.id);
  });

  it('creates a user even when Apple never sends an email', async () => {
    const { useCase, appleIdentityVerifier } = buildUseCase();
    appleIdentityVerifier.willResolveWith({ subject: 'apple-subject-3', email: null });

    const result = await useCase.execute({ identityToken: 'token' });

    expect(result.user.emailVerified).toBe(false);
    expect(result.user.email).toContain('apple-subject-3');
  });
});
