import { NotificationChannel } from '../../domain/notification-channel.js';
import { NotificationChannelRegistry } from '../../domain/notification-channel-registry.js';
import { UnknownNotificationChannelError } from '../../domain/notification.errors.js';

// Not a *.spec.ts file, so vitest's `**/*.spec.ts` include does not run it as a test.
export class FakeNotificationChannelRegistry extends NotificationChannelRegistry {
  private readonly channels = new Map<string, NotificationChannel>();

  register(channel: NotificationChannel): void {
    this.channels.set(channel.name, channel);
  }

  isKnown(name: string): boolean {
    return this.channels.has(name);
  }

  get(name: string): NotificationChannel {
    const channel = this.channels.get(name);
    if (!channel) throw new UnknownNotificationChannelError(name);
    return channel;
  }
}
