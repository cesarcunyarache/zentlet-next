import { describe, expect, it } from 'vitest';
import { InMemorySessionRepository } from '../../../infrastructure/session/in-memory-session.repository.js';
import { SignOutUseCase } from './sign-out.use-case.js';

describe('SignOutUseCase', () => {
  it('deletes the session matching the given token', async () => {
    const sessionRepository = new InMemorySessionRepository();
    await sessionRepository.create({
      id: 'session-1',
      token: 'token-to-delete',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      ipAddress: null,
      userAgent: null,
    });
    const useCase = new SignOutUseCase(sessionRepository);

    await useCase.execute({ token: 'token-to-delete' });

    expect(await sessionRepository.findByToken('token-to-delete')).toBeNull();
  });

  it('does nothing when the token does not match any session', async () => {
    const sessionRepository = new InMemorySessionRepository();
    const useCase = new SignOutUseCase(sessionRepository);

    await expect(useCase.execute({ token: 'unknown-token' })).resolves.toBeUndefined();
  });
});
