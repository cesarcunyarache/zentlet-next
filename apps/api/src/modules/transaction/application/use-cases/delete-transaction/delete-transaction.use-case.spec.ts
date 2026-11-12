import { describe, expect, it } from 'vitest';
import { TransactionNotFoundError } from '../../../domain/transaction.errors.js';
import { InMemoryTransactionRepository } from '../../../infrastructure/transaction/in-memory-transaction.repository.js';
import { DeleteTransactionUseCase } from './delete-transaction.use-case.js';

const USER_ID = 'user-1';

async function seedTransaction(repository: InMemoryTransactionRepository) {
  const now = new Date();
  const transaction = {
    id: crypto.randomUUID(),
    userId: USER_ID,
    type: 'expense' as const,
    amount: 50,
    categoryId: 'category-1',
    description: null,
    reference: null,
    transactionDate: new Date('2024-01-10'),
    recurringTransactionId: null,
    listId: 'list-1',
    createdAt: now,
    updatedAt: now,
  };
  await repository.create(transaction);
  return transaction;
}

describe('DeleteTransactionUseCase', () => {
  it('deletes an owned transaction', async () => {
    const transactionRepository = new InMemoryTransactionRepository();
    const transaction = await seedTransaction(transactionRepository);
    const useCase = new DeleteTransactionUseCase(transactionRepository);

    await useCase.execute({ id: transaction.id, userId: USER_ID });

    expect(await transactionRepository.findById(transaction.id)).toBeNull();
  });

  it('throws when the transaction does not exist', async () => {
    const transactionRepository = new InMemoryTransactionRepository();
    const useCase = new DeleteTransactionUseCase(transactionRepository);

    await expect(useCase.execute({ id: 'missing', userId: USER_ID })).rejects.toThrow(TransactionNotFoundError);
  });

  it('throws when the transaction belongs to another user', async () => {
    const transactionRepository = new InMemoryTransactionRepository();
    const transaction = await seedTransaction(transactionRepository);
    const useCase = new DeleteTransactionUseCase(transactionRepository);

    await expect(useCase.execute({ id: transaction.id, userId: 'user-2' })).rejects.toThrow(TransactionNotFoundError);
    expect(await transactionRepository.findById(transaction.id)).not.toBeNull();
  });
});
