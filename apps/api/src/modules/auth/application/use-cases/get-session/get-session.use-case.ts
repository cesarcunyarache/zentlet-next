import { Injectable } from '@nestjs/common';
import { SessionRepository } from '../../../domain/session.repository.js';
import { UserRepository } from '../../../domain/user.repository.js';
import type { GetSessionInput } from './get-session.input.js';
import type { GetSessionOutput } from './get-session.output.js';

@Injectable()
export class GetSessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: GetSessionInput): Promise<GetSessionOutput> {
    const session = await this.sessionRepository.findByToken(input.token);
    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now()) return null;

    const user = await this.userRepository.findById(session.userId);
    if (!user) return null;

    return { user, session };
  }
}
