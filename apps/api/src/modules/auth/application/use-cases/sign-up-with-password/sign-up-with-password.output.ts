import type { Session } from '../../../domain/session/session.js';
import type { User } from '../../../domain/user/user.js';

export type SignUpWithPasswordOutput = {
  user: User;
  session: Session;
};
