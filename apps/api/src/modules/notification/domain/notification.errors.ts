export class UnknownNotificationChannelError extends Error {
  constructor(readonly channel: string) {
    super(`Unknown notification channel: ${channel}`);
    this.name = 'UnknownNotificationChannelError';
  }
}
