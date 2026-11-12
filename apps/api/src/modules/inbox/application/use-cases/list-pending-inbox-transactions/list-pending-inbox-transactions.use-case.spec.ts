import { describe, expect, it } from 'vitest';
import { InMemoryInboxTransactionRepository } from '../../../infrastructure/inbox-transaction/in-memory-inbox-transaction.repository.js';
import { ListPendingInboxTransactionsUseCase } from './list-pending-inbox-transactions.use-case.js';

describe('ListPendingInboxTransactionsUseCase', () => {
  it('lists only the pending candidates owned by the user', async () => {
    const repository = new InMemoryInboxTransactionRepository();
    await repository.insert({
      userId: 'user-1',
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
      merchant: null,
      description: 'Consumo',
      categoryId: null,
      isLearned: false,
      transactionDate: new Date('2026-09-24'),
      cardLast4: null,
      reference: null,
      duplicateOfId: null,
      receivedAt: new Date('2026-09-25'),
    });

    const pending = await new ListPendingInboxTransactionsUseCase(repository).execute('user-1');

    expect(pending).toHaveLength(1);
    expect(await new ListPendingInboxTransactionsUseCase(repository).execute('user-2')).toHaveLength(0);
  });
});
