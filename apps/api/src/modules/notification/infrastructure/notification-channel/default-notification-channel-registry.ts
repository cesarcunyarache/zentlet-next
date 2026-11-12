import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../../domain/notification-channel.js';
import { NotificationChannelRegistry } from '../../domain/notification-channel-registry.js';
import { UnknownNotificationChannelError } from '../../domain/notification.errors.js';
import { EmailNotificationChannel } from './email-notification-channel.js';

@Injectable()
export class DefaultNotificationChannelRegistry extends NotificationChannelRegistry {
  private readonly channels: Map<string, NotificationChannel>;

  constructor(emailChannel: EmailNotificationChannel) {
    super();
    this.channels = new Map([[emailChannel.name, emailChannel]]);
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
