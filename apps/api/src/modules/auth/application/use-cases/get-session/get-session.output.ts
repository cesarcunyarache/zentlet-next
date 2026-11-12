import type { Session } from '../../../domain/session.js';
import type { User } from '../../../domain/user.js';

export type GetSessionOutput = {
  user: User;
  session: Session;
} | null;
