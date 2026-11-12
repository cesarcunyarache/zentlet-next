import { Injectable } from '@nestjs/common';
import { SessionRepository } from '../../../domain/session.repository.js';
import type { SignOutInput } from './sign-out.input.js';

@Injectable()
export class SignOutUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(input: SignOutInput): Promise<void> {
    await this.sessionRepository.deleteByToken(input.token);
  }
}
