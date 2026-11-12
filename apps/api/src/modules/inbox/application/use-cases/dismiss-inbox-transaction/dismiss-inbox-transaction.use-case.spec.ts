import { describe, expect, it } from 'vitest';
import { InMemoryInboxSenderRepository } from '../../../infrastructure/inbox-sender/in-memory-inbox-sender.repository.js';
import { InMemoryInboxTransactionRepository } from '../../../infrastructure/inbox-transaction/in-memory-inbox-transaction.repository.js';
import { DismissInboxTransactionUseCase } from './dismiss-inbox-transaction.use-case.js';

const USER = 'user-1';
const SENDER = 'alerts@shop.pe';

async function seedPendingTransaction(inboxTransactionRepository: InMemoryInboxTransactionRepository, senderAddress = SENDER) {
  await inboxTransactionRepository.insert({
    userId: USER,
    externalId: crypto.randomUUID(),
    senderAddress,
    bank: null,
    subject: 'Consumo',
    parser: 'generic',
    isVerified: false,
    isNewSender: true,
    type: 'expense',
    amount: 14.5,
    currency: 'PEN',
    merchant: 'IKF A53',
    description: 'IKF A53',
    categoryId: null,
    isLearned: false,
    transactionDate: new Date('2026-09-24'),
    cardLast4: null,
    reference: null,
    duplicateOfId: null,
    receivedAt: new Date('2026-09-25T04:55:00.000Z'),
  });
  const items = await inboxTransactionRepository.findPending(USER);
  return items[items.length - 1];
}

function setup() {
  const inboxTransactionRepository = new InMemoryInboxTransactionRepository();
  const inboxSenderRepository = new InMemoryInboxSenderRepository();
  const useCase = new DismissInboxTransactionUseCase(inboxTransactionRepository, inboxSenderRepository);
  return { inboxTransactionRepository, inboxSenderRepository, useCase };
}

describe('DismissInboxTransactionUseCase', () => {
  it('dismisses the candidate and counts the dismissal against the sender', async () => {
    const { inboxTransactionRepository, inboxSenderRepository, useCase } = setup();
    const item = await seedPendingTransaction(inboxTransactionRepository);

    expect(await useCase.execute(USER, item.id)).toEqual({ ok: true });

    expect(await inboxTransactionRepository.findPendingOwned(USER, item.id)).toBeNull();
    const [sender] = await inboxSenderRepository.findAll(USER);
    expect(sender).toMatchObject({ address: SENDER, dismissedCount: 1, status: 'trusted' });
  });

  it('blocks a learned sender after enough dismissals without a single acceptance', async () => {
    const { inboxTransactionRepository, inboxSenderRepository, useCase } = setup();
    for (let i = 0; i < 3; i++) {
      const item = await seedPendingTransaction(inboxTransactionRepository);
      await useCase.execute(USER, item.id);
    }

    const [sender] = await inboxSenderRepository.findAll(USER);
    expect(sender.status).toBe('blocked');
  });

  it('never auto-blocks a sender the user added manually', async () => {
    const { inboxTransactionRepository, inboxSenderRepository, useCase } = setup();
    await inboxSenderRepository.trust(USER, SENDER);

    for (let i = 0; i < 5; i++) {
      const item = await seedPendingTransaction(inboxTransactionRepository);
      await useCase.execute(USER, item.id);
    }

    const [sender] = await inboxSenderRepository.findAll(USER);
    expect(sender.status).toBe('trusted');
  });

  it('a resolved or someone else\'s candidate is not_found', async () => {
    const { useCase } = setup();

    expect(await useCase.execute(USER, 'missing')).toEqual({ error: 'not_found' });
  });
});
