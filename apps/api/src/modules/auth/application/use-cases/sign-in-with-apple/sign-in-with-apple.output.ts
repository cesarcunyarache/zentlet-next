import type { Session } from '../../../domain/session/session.js';
import type { User } from '../../../domain/user/user.js';

export type SignInWithAppleOutput = {
  user: User;
  session: Session;
};
