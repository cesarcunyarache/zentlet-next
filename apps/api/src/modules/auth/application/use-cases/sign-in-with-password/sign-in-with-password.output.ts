import type { Session } from '../../../domain/session.js';
import type { User } from '../../../domain/user.js';

export type SignInWithPasswordOutput = {
  user: User;
  session: Session;
};
