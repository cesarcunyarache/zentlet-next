import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../../domain/transaction/transaction.js';
import { InMemoryTransactionRepository } from '../../../infrastructure/transaction/in-memory-transaction.repository.js';
import { SummarizeTransactionsUseCase } from './summarize-transactions.use-case.js';

const USER_ID = 'user-1';

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    userId: USER_ID,
    type: 'expense',
    amount: 10,
    categoryId: 'category-1',
    description: null,
    reference: null,
    transactionDate: now,
    recurringTransactionId: null,
    listId: 'list-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('SummarizeTransactionsUseCase', () => {
  it('sums matching transaction amounts', async () => {
    const transactionRepository = new InMemoryTransactionRepository();
    await transactionRepository.create(makeTransaction({ amount: 30 }));
    await transactionRepository.create(makeTransaction({ amount: 20 }));
    await transactionRepository.create(makeTransaction({ amount: 999, userId: 'someone-else' }));
    const useCase = new SummarizeTransactionsUseCase(transactionRepository);

    const result = await useCase.execute({ userId: USER_ID });

    expect(result.total).toBe(50);
  });

  it('scopes the sum by category when provided', async () => {
    const transactionRepository = new InMemoryTransactionRepository();
    await transactionRepository.create(makeTransaction({ amount: 30, categoryId: 'category-1' }));
    await transactionRepository.create(makeTransaction({ amount: 20, categoryId: 'category-2' }));
    const useCase = new SummarizeTransactionsUseCase(transactionRepository);

    const result = await useCase.execute({ userId: USER_ID, categoryId: 'category-1' });

    expect(result.total).toBe(30);
  });

  it('returns zero when nothing matches', async () => {
    const transactionRepository = new InMemoryTransactionRepository();
    const useCase = new SummarizeTransactionsUseCase(transactionRepository);

    const result = await useCase.execute({ userId: USER_ID });

    expect(result.total).toBe(0);
  });
});
