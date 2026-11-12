import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '../logger/types.js';
import { EmailSender, type Email } from './types.js';

@Injectable()
export class EmailService {
  constructor(
    @Inject(EmailSender) private readonly sender: EmailSender | null,
    private readonly logger: Logger,
  ) {}

  isConfigured(): boolean {
    return this.sender !== null && Boolean(process.env.EMAIL_FROM);
  }

  /** Never throws: a failed send must not break sign-up or sign-in. */
  async send(email: Email): Promise<boolean> {
    const from = process.env.EMAIL_FROM;

    if (!this.sender || !from) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.info({ to: '[dev]', subject: email.subject, text: email.text }, 'email.dev_outbox');
        return true;
      }
      this.logger.error({ subject: email.subject }, 'email.not_configured');
      return false;
    }

    try {
      await this.sender.send(email, from);
      return true;
    } catch (error) {
      this.logger.error({ err: error, provider: this.sender.name, subject: email.subject }, 'email.send_failed');
      return false;
    }
  }
}
