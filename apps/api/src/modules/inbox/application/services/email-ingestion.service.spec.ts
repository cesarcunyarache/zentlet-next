import { describe, expect, it, vi } from 'vitest';
import type { InboundEmail } from '../../domain/inbox-transaction/inbox-transaction.js';
import { InMemoryInboxSenderRepository } from '../../infrastructure/inbox-sender/in-memory-inbox-sender.repository.js';
import { InMemoryInboxTransactionRepository } from '../../infrastructure/inbox-transaction/in-memory-inbox-transaction.repository.js';
import { InMemoryMerchantRuleRepository } from '../../infrastructure/merchant-rule/in-memory-merchant-rule.repository.js';
import { FakeUserCalendar } from '../../infrastructure/fake-user-calendar.js';
import { EmailIngestionService } from './email-ingestion.service.js';

const USER = 'user-1';

const BCP_BODY = `Realizaste un consumo de S/ 14.50 con tu Tarjeta de Débito BCP en IKF A53 PIURA 21.
Total del consumo\tS/ 14.50
Fecha y hora\t24 de setiembre de 2026 - 06:54 PM
Número de operación\t576278`;

const email = (overrides: Partial<InboundEmail> = {}): InboundEmail => ({
  messageId: 'message-1',
  from: 'BCP <notificaciones@notificacionesbcp.com.pe>',
  recipients: [],
  subject: 'Constancia de consumo',
  text: BCP_BODY,
  html: '',
  headers: [],
  receivedAt: new Date('2026-09-25T04:55:00.000Z'),
  ...overrides,
});

function setup() {
  const inboxTransactionRepository = new InMemoryInboxTransactionRepository();
  const inboxSenderRepository = new InMemoryInboxSenderRepository();
  const merchantRuleRepository = new InMemoryMerchantRuleRepository();
  const userCalendar = new FakeUserCalendar('2026-09-25');
  const service = new EmailIngestionService(inboxTransactionRepository, inboxSenderRepository, merchantRuleRepository, userCalendar);
  return { inboxTransactionRepository, inboxSenderRepository, merchantRuleRepository, service };
}

describe('EmailIngestionService', () => {
  it('a MerchantRule for the sender always overrides the keyword category guess', async () => {
    const { inboxTransactionRepository, merchantRuleRepository, service } = setup();
    await merchantRuleRepository.upsert(USER, 'ikf piura', 'food', 'Almuerzo');
    inboxTransactionRepository.seedCategory(USER, { id: 'misc', name: 'IKF A53', icon: 'tag', color: '#000' });

    const outcome = await service.ingest(USER, email());

    expect(outcome).toBe('created');
    const [pending] = await inboxTransactionRepository.findPending(USER);
    expect(pending).toMatchObject({ bank: 'BCP', amount: 14.5, categoryId: 'food', description: 'Almuerzo', isLearned: true, reference: '576278' });
  });

  it('without a learned rule it falls back to the deterministic keyword matcher', async () => {
    const { inboxTransactionRepository, service } = setup();
    inboxTransactionRepository.seedCategory(USER, { id: 'food-cat', name: 'IKF A53', icon: 'tag', color: '#000' });

    await service.ingest(USER, email());

    const [pending] = await inboxTransactionRepository.findPending(USER);
    expect(pending).toMatchObject({ categoryId: 'food-cat', isLearned: false });
  });

  it('a blocked sender is never processed', async () => {
    const { inboxSenderRepository, inboxTransactionRepository, service } = setup();
    const blocked = await inboxSenderRepository.trust(USER, 'notificaciones@notificacionesbcp.com.pe');
    await inboxSenderRepository.block(blocked.id);

    expect(await service.ingest(USER, email())).toBe('blocked');
    expect(await inboxTransactionRepository.findPending(USER)).toHaveLength(0);
  });

  it('an email that does not describe a movement is ignored', async () => {
    const { service } = setup();

    expect(await service.ingest(USER, email({ text: 'Hola, tenemos ofertas para ti' }))).toBe('ignored');
  });

  it('the same operation received twice is a duplicate', async () => {
    const { inboxTransactionRepository, service } = setup();
    await service.ingest(USER, email());

    expect(await service.ingest(USER, email({ messageId: 'message-2' }))).toBe('duplicate');
    expect(await inboxTransactionRepository.findPending(USER)).toHaveLength(1);
  });

  it('the same Gmail message id retried is a duplicate even without a reference to match on', async () => {
    const { inboxTransactionRepository, service } = setup();
    const noReference = email({
      text: 'Realizaste un consumo de S/ 14.50 con tu Tarjeta de Débito BCP en IKF A53 PIURA 21.\nTotal del consumo\tS/ 14.50',
    });
    await service.ingest(USER, noReference);

    expect(await service.ingest(USER, noReference)).toBe('duplicate');
    expect(await inboxTransactionRepository.findPending(USER)).toHaveLength(1);
  });

  it('looks for a similar movement one day before and after', async () => {
    const { inboxTransactionRepository, service } = setup();
    const spy = vi.spyOn(inboxTransactionRepository, 'findSimilarTransactionId');

    await service.ingest(USER, email());

    expect(spy).toHaveBeenCalledWith(USER, expect.objectContaining({ amount: 14.5 }), { from: new Date('2026-09-23'), to: new Date('2026-09-25') });
  });

  it('a first-time sender with no rule yet (and no known bank) is flagged as a new sender', async () => {
    const { inboxTransactionRepository, service } = setup();

    await service.ingest(USER, email({ from: 'alerts@shop.pe', messageId: 'message-2' }));

    const [pending] = await inboxTransactionRepository.findPending(USER);
    expect(pending.isNewSender).toBe(true);
  });

  it('a known bank sender is never flagged as a new sender', async () => {
    const { inboxTransactionRepository, service } = setup();

    await service.ingest(USER, email());

    const [pending] = await inboxTransactionRepository.findPending(USER);
    expect(pending.isNewSender).toBe(false);
  });
});
