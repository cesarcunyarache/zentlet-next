import { Injectable } from '@nestjs/common';
import type { Session } from '../domain/session.js';
import { SessionRepository } from '../domain/session.repository.js';

@Injectable()
export class InMemorySessionRepository extends SessionRepository {
  private readonly sessions = new Map<string, Session>();

  async create(session: Session): Promise<Session> {
    this.sessions.set(session.token, session);
    return session;
  }

  async findByToken(token: string): Promise<Session | null> {
    return this.sessions.get(token) ?? null;
  }

  async deleteByToken(token: string): Promise<void> {
    this.sessions.delete(token);
  }
}
