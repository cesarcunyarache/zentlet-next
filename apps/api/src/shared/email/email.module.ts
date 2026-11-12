import { Global, Module } from '@nestjs/common';
import { ResendEmailSender } from './infrastructure/resend-email-sender.js';
import { EmailService } from './application/email.service.js';
import { EmailSender } from './domain/email.js';

const PROVIDERS: Record<string, () => EmailSender | null> = {
  resend: () => (process.env.RESEND_API_KEY ? new ResendEmailSender(process.env.RESEND_API_KEY) : null),
};

@Global()
@Module({
  providers: [
    {
      provide: EmailSender,
      useFactory: () => PROVIDERS[process.env.EMAIL_PROVIDER || 'resend']?.() ?? null,
    },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}
