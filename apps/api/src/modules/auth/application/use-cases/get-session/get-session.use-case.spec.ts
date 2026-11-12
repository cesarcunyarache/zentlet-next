import { describe, expect, it } from 'vitest';
import { InMemorySessionRepository } from '../../../infrastructure/session/in-memory-session.repository.js';
import { InMemoryUserRepository } from '../../../infrastructure/user/in-memory-user.repository.js';
import { GetSessionUseCase } from './get-session.use-case.js';

const BASE_USER = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'User',
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GetSessionUseCase', () => {
  it('returns the user and session for a valid token', async () => {
    const userRepository = new InMemoryUserRepository();
    const sessionRepository = new InMemorySessionRepository();
    await userRepository.create(BASE_USER);
    await sessionRepository.create({
      id: 'session-1',
      token: 'valid-token',
      userId: BASE_USER.id,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      ipAddress: null,
      userAgent: null,
    });
    const useCase = new GetSessionUseCase(sessionRepository, userRepository);

    const result = await useCase.execute({ token: 'valid-token' });

    expect(result?.user.id).toBe(BASE_USER.id);
  });

  it('returns null for an unknown token', async () => {
    const useCase = new GetSessionUseCase(new InMemorySessionRepository(), new InMemoryUserRepository());

    expect(await useCase.execute({ token: 'unknown-token' })).toBeNull();
  });

  it('returns null for an expired session', async () => {
    const userRepository = new InMemoryUserRepository();
    const sessionRepository = new InMemorySessionRepository();
    await userRepository.create(BASE_USER);
    await sessionRepository.create({
      id: 'session-1',
      token: 'expired-token',
      userId: BASE_USER.id,
      expiresAt: new Date(Date.now() - 60_000),
      createdAt: new Date(),
      ipAddress: null,
      userAgent: null,
    });
    const useCase = new GetSessionUseCase(sessionRepository, userRepository);

    expect(await useCase.execute({ token: 'expired-token' })).toBeNull();
  });
});
