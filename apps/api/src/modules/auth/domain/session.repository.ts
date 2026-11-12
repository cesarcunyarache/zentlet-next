import type { Session } from './session.js';

export abstract class SessionRepository {
  abstract create(session: Session): Promise<Session>;
  abstract findByToken(token: string): Promise<Session | null>;
  abstract deleteByToken(token: string): Promise<void>;
}
