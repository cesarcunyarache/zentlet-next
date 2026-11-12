import { Injectable } from '@nestjs/common';
import { EmailService } from '../../../../shared/email/application/email.service.js';
import { NotificationChannel } from '../../domain/notification-channel.js';
import type { NotificationRecipient } from '../../domain/notification-delivery/notification-delivery.js';
import type { Notification } from '../../domain/notification/notification.js';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

// No locale/template infrastructure in this backend yet (the source feature
// renders through next-intl): this renders a plain, untranslated message
// from `type` and `data` instead of porting the i18n templates.
function renderText(notification: Notification): string {
  return `${notification.type}: ${JSON.stringify(notification.data)}`;
}

@Injectable()
export class EmailNotificationChannel extends NotificationChannel {
  readonly name = 'email';

  constructor(private readonly emailService: EmailService) {
    super();
  }

  send(notification: Notification, recipient: NotificationRecipient): Promise<boolean> {
    const text = renderText(notification);
    return this.emailService.send({
      to: recipient.email,
      subject: `New notification: ${notification.type}`,
      html: `<p>${escapeHtml(text)}</p>`,
      text,
    });
  }
}
