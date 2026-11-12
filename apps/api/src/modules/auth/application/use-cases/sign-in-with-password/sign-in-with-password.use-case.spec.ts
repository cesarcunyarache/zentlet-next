import { describe, expect, it } from 'vitest';
import { InvalidCredentialsError } from '../../../domain/auth.errors.js';
import { InMemoryAccountRepository } from '../../../infrastructure/account/in-memory-account.repository.js';
import { InMemorySessionRepository } from '../../../infrastructure/session/in-memory-session.repository.js';
import { InMemoryUserRepository } from '../../../infrastructure/user/in-memory-user.repository.js';
import { NodePasswordHasher } from '../../../infrastructure/password/node-password-hasher.js';
import { SignUpWithPasswordUseCase } from '../sign-up-with-password/sign-up-with-password.use-case.js';
import { SignInWithPasswordUseCase } from './sign-in-with-password.use-case.js';

function buildUseCases() {
  const userRepository = new InMemoryUserRepository();
  const accountRepository = new InMemoryAccountRepository();
  const sessionRepository = new InMemorySessionRepository();
  const passwordHasher = new NodePasswordHasher();
  const signUp = new SignUpWithPasswordUseCase(userRepository, accountRepository, sessionRepository, passwordHasher);
  const signIn = new SignInWithPasswordUseCase(userRepository, accountRepository, sessionRepository, passwordHasher);
  return { signUp, signIn };
}

describe('SignInWithPasswordUseCase', () => {
  it('signs in an existing user with the correct password', async () => {
    const { signUp, signIn } = buildUseCases();
    const { user } = await signUp.execute({
      email: 'existing@example.com',
      password: 'correct-password',
      name: 'Existing User',
    });

    const result = await signIn.execute({ email: 'existing@example.com', password: 'correct-password' });

    expect(result.user.id).toBe(user.id);
    expect(result.session.userId).toBe(user.id);
  });

  it('rejects sign-in for an unknown email', async () => {
    const { signIn } = buildUseCases();

    await expect(signIn.execute({ email: 'missing@example.com', password: 'any-password' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('rejects sign-in for a wrong password', async () => {
    const { signUp, signIn } = buildUseCases();
    await signUp.execute({ email: 'existing@example.com', password: 'correct-password', name: 'Existing User' });

    await expect(signIn.execute({ email: 'existing@example.com', password: 'wrong-password' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });
});
