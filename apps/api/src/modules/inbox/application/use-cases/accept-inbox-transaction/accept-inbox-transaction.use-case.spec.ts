import { describe, expect, it } from 'vitest';
import { InMemoryInboxSenderRepository } from '../../../infrastructure/inbox-sender/in-memory-inbox-sender.repository.js';
import { InMemoryInboxTransactionRepository } from '../../../infrastructure/inbox-transaction/in-memory-inbox-transaction.repository.js';
import { InMemoryMerchantRuleRepository } from '../../../infrastructure/merchant-rule/in-memory-merchant-rule.repository.js';
import { AcceptInboxTransactionUseCase } from './accept-inbox-transaction.use-case.js';

const USER = 'user-1';
const input = { description: 'Almuerzo', amount: 14.5, type: 'expense' as const, categoryId: 'food', transactionDate: '2026-09-24' };

async function seedPendingTransaction(inboxTransactionRepository: InMemoryInboxTransactionRepository) {
  inboxTransactionRepository.seedCategory(USER, { id: 'food', name: 'Comida', icon: 'cart', color: '#000' });
  await inboxTransactionRepository.insert({
    userId: USER,
    externalId: 'message-1',
    senderAddress: 'alerts@shop.pe',
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
    reference: '576278',
    duplicateOfId: null,
    receivedAt: new Date('2026-09-25T04:55:00.000Z'),
  });
  const [item] = await inboxTransactionRepository.findPending(USER);
  return item;
}

function setup() {
  const inboxTransactionRepository = new InMemoryInboxTransactionRepository();
  const inboxSenderRepository = new InMemoryInboxSenderRepository();
  const merchantRuleRepository = new InMemoryMerchantRuleRepository();
  const useCase = new AcceptInboxTransactionUseCase(inboxTransactionRepository, inboxSenderRepository, merchantRuleRepository);
  return { inboxTransactionRepository, inboxSenderRepository, merchantRuleRepository, useCase };
}

describe('AcceptInboxTransactionUseCase', () => {
  it('resolves the candidate, learns the merchant rule, and trusts the sender', async () => {
    const { inboxTransactionRepository, inboxSenderRepository, merchantRuleRepository, useCase } = setup();
    const item = await seedPendingTransaction(inboxTransactionRepository);

    const result = await useCase.execute(USER, item.id, input);

    expect(result).toEqual({ inboxTransactionId: item.id, transaction: { ...input, transactionDate: new Date('2026-09-24'), userId: USER, reference: '576278' } });
    expect(await inboxTransactionRepository.findPendingOwned(USER, item.id)).toBeNull();
    expect(await merchantRuleRepository.find(USER, 'ikf')).toEqual({ categoryId: 'food', description: 'Almuerzo' });
    const [sender] = await inboxSenderRepository.findAll(USER);
    expect(sender).toMatchObject({ address: 'alerts@shop.pe', acceptedCount: 1 });
  });

  it('a resolved or someone else\'s candidate is not_found', async () => {
    const { useCase } = setup();

    expect(await useCase.execute(USER, 'missing', input)).toEqual({ error: 'not_found' });
  });

  it('a category owned by another user is category_not_found', async () => {
    const { inboxTransactionRepository, useCase } = setup();
    const item = await seedPendingTransaction(inboxTransactionRepository);

    expect(await useCase.execute(USER, item.id, { ...input, categoryId: 'someone-elses-category' })).toEqual({ error: 'category_not_found' });
    expect(await inboxTransactionRepository.findPendingOwned(USER, item.id)).not.toBeNull();
  });
});
