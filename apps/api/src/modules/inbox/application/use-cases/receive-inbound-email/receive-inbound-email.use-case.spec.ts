import { describe, expect, it } from 'vitest';
import type { InboundEmail } from '../../../domain/inbox-transaction/inbox-transaction.js';
import { InMemoryEmailInboxRepository } from '../../../infrastructure/email-inbox/in-memory-email-inbox.repository.js';
import { InMemoryInboxSenderRepository } from '../../../infrastructure/inbox-sender/in-memory-inbox-sender.repository.js';
import { InMemoryInboxTransactionRepository } from '../../../infrastructure/inbox-transaction/in-memory-inbox-transaction.repository.js';
import { InMemoryMerchantRuleRepository } from '../../../infrastructure/merchant-rule/in-memory-merchant-rule.repository.js';
import { FakeUserCalendar } from '../../../infrastructure/fake-user-calendar.js';
import { EmailIngestionService } from '../../services/email-ingestion.service.js';
import { ReceiveInboundEmailUseCase } from './receive-inbound-email.use-case.js';

const USER = 'user-1';

const email = (overrides: Partial<InboundEmail> = {}): InboundEmail => ({
  messageId: 'message-1',
  from: 'alerts@shop.pe',
  recipients: ['Ana <ANA.k3x@in.zentlet.app>'],
  subject: 'Consumo',
  text: 'Consumo de S/ 10.00',
  html: '',
  headers: [],
  receivedAt: new Date('2026-09-25T04:55:00.000Z'),
  ...overrides,
});

function setup() {
  const emailInboxRepository = new InMemoryEmailInboxRepository();
  const ingestion = new EmailIngestionService(
    new InMemoryInboxTransactionRepository(),
    new InMemoryInboxSenderRepository(),
    new InMemoryMerchantRuleRepository(),
    new FakeUserCalendar(),
  );
  return { emailInboxRepository, useCase: new ReceiveInboundEmailUseCase(emailInboxRepository, ingestion) };
}

describe('ReceiveInboundEmailUseCase', () => {
  it('finds the mailbox by the normalized recipient addresses, records the receipt, and processes the email', async () => {
    const { emailInboxRepository, useCase } = setup();
    await emailInboxRepository.insert(USER, 'ana.k3x@in.zentlet.app');

    expect(await useCase.execute(email())).toBe('created');
    expect(await emailInboxRepository.findByUser(USER)).toMatchObject({ lastReceivedAt: email().receivedAt });
  });

  it('an email for nobody known is not processed', async () => {
    const { useCase } = setup();

    expect(await useCase.execute(email())).toBe('unknown_recipient');
    expect(await useCase.execute(email({ recipients: [] }))).toBe('unknown_recipient');
  });

  it('a Gmail forwarding confirmation is saved as verification, not a movement', async () => {
    const { emailInboxRepository, useCase } = setup();
    await emailInboxRepository.insert(USER, 'ana.k3x@in.zentlet.app');
    const verification = email({ from: 'Gmail Team <forwarding-noreply@google.com>', subject: '(#123456789) Gmail Forwarding Confirmation' });

    expect(await useCase.execute(verification)).toBe('verification');
    expect(await emailInboxRepository.findByUser(USER)).toMatchObject({ verificationCode: '123456789' });
  });
});
