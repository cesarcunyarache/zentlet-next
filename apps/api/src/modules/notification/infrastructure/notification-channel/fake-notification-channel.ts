import { vi } from 'vitest';
import { NotificationChannel } from '../../domain/notification-channel.js';

// Not a *.spec.ts file, so vitest's `**/*.spec.ts` include does not run it as a test.
export class FakeNotificationChannel extends NotificationChannel {
  constructor(readonly name: string = 'email') {
    super();
  }

  send = vi.fn<NotificationChannel['send']>().mockResolvedValue(true);
}
