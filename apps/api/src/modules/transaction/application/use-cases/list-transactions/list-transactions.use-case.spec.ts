import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../../domain/transaction/transaction.js';
import { InvalidTransactionCursorError } from '../../../domain/transaction.errors.js';
import { InMemoryTransactionRepository } from '../../../infrastructure/transaction/in-memory-transaction.repository.js';
import { ListTransactionsUseCase } from './list-transactions.use-case.js';

const USER_ID = 'user-1';

async function seedTransactions(repository: InMemoryTransactionRepository, count: number): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  for (let index = 0; index < count; index += 1) {
    const day = String(index + 1).padStart(2, '0');
    const transaction: Transaction = {
      id: `tx-${index}`,
      userId: USER_ID,
      type: 'expense',
      amount: 10 + index,
      categoryId: 'category-1',
      description: null,
      reference: null,
      transactionDate: new Date(`2024-01-${day}`),
      recurringTransactionId: null,
      listId: 'list-1',
      createdAt: new Date(`2024-01-${day}T00:00:00Z`),
      updatedAt: new Date(`2024-01-${day}T00:00:00Z`),
    };
    await repository.create(transaction);
    transactions.push(transaction);
  }
  return transactions;
}

describe('ListTransactionsUseCase', () => {
  it('returns the most recent transactions first', async () => {
    const transactionRepository = new InMemoryTransactionRepository();
    await seedTransactions(transactionRepository, 3);
    const useCase = new ListTransactionsUseCase(transactionRepository);

    const result = await useCase.execute({ userId: USER_ID, limit: 10 });

    expect(result.transactions.map((transaction) => transaction.id)).toEqual(['tx-2', 'tx-1', 'tx-0']);
    expect(result.nextCursor).toBeNull();
  });

  it('paginates with a cursor and eventually reaches the end', async () => {
    const transactionRepository = new InMemoryTransactionRepository();
    await seedTransactions(transactionRepository, 3);
    const useCase = new ListTransactionsUseCase(transactionRepository);

    const firstPage = await useCase.execute({ userId: USER_ID, limit: 2 });
    expect(firstPage.transactions.map((transaction) => transaction.id)).toEqual(['tx-2', 'tx-1']);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await useCase.execute({ userId: USER_ID, limit: 2, cursor: firstPage.nextCursor ?? undefined });
    expect(secondPage.transactions.map((transaction) => transaction.id)).toEqual(['tx-0']);
    expect(secondPage.nextCursor).toBeNull();
  });

  it('rejects a malformed cursor', async () => {
    const transactionRepository = new InMemoryTransactionRepository();
    const useCase = new ListTransactionsUseCase(transactionRepository);

    await expect(useCase.execute({ userId: USER_ID, cursor: 'not-a-cursor' })).rejects.toThrow(InvalidTransactionCursorError);
  });

  it('scopes results to the requesting user', async () => {
    const transactionRepository = new InMemoryTransactionRepository();
    await seedTransactions(transactionRepository, 2);
    const useCase = new ListTransactionsUseCase(transactionRepository);

    const result = await useCase.execute({ userId: 'someone-else' });

    expect(result.transactions).toEqual([]);
  });
});
