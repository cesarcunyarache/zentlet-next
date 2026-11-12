import type { NotificationChannel } from './notification-channel.js';

// Strategy registry: adding a channel means adding an adapter and
// registering it here — use-cases never know which channels exist.
export abstract class NotificationChannelRegistry {
  abstract isKnown(name: string): boolean;
  abstract get(name: string): NotificationChannel;
}
