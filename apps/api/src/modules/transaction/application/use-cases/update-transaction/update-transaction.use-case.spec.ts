import { describe, expect, it } from 'vitest';
import type { PrismaService } from '../../../../../shared/prisma/infrastructure/prisma.service.js';
import { CategoryNotOwnedError, InvalidTransactionAmountError, TransactionNotFoundError } from '../../../domain/transaction.errors.js';
import { InMemoryTransactionRepository } from '../../../infrastructure/transaction/in-memory-transaction.repository.js';
import { UpdateTransactionUseCase } from './update-transaction.use-case.js';

const USER_ID = 'user-1';
const OTHER_CATEGORY_ID = 'category-2';

function makePrismaStub() {
  return {
    category: {
      findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
        where.userId === USER_ID && where.id === OTHER_CATEGORY_ID ? { id: where.id } : null,
    },
  };
}

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

function makeUseCase() {
  const transactionRepository = new InMemoryTransactionRepository();
  const prisma = makePrismaStub() as unknown as PrismaService;
  return { useCase: new UpdateTransactionUseCase(transactionRepository, prisma), transactionRepository };
}

describe('UpdateTransactionUseCase', () => {
  it('updates owned fields', async () => {
    const { useCase, transactionRepository } = makeUseCase();
    const transaction = await seedTransaction(transactionRepository);

    const result = await useCase.execute({ id: transaction.id, userId: USER_ID, patch: { amount: 75 } });

    expect(result.transaction.amount).toBe(75);
  });

  it('re-validates category ownership when categoryId is part of the patch', async () => {
    const { useCase, transactionRepository } = makeUseCase();
    const transaction = await seedTransaction(transactionRepository);

    const result = await useCase.execute({
      id: transaction.id,
      userId: USER_ID,
      patch: { categoryId: OTHER_CATEGORY_ID },
    });
    expect(result.transaction.categoryId).toBe(OTHER_CATEGORY_ID);

    await expect(
      useCase.execute({ id: transaction.id, userId: USER_ID, patch: { categoryId: 'not-owned' } }),
    ).rejects.toThrow(CategoryNotOwnedError);
  });

  it('rejects a non-positive amount', async () => {
    const { useCase, transactionRepository } = makeUseCase();
    const transaction = await seedTransaction(transactionRepository);

    await expect(
      useCase.execute({ id: transaction.id, userId: USER_ID, patch: { amount: -1 } }),
    ).rejects.toThrow(InvalidTransactionAmountError);
  });

  it('throws when the transaction does not exist or is not owned by the user', async () => {
    const { useCase, transactionRepository } = makeUseCase();
    const transaction = await seedTransaction(transactionRepository);

    await expect(
      useCase.execute({ id: 'missing', userId: USER_ID, patch: { amount: 10 } }),
    ).rejects.toThrow(TransactionNotFoundError);
    await expect(
      useCase.execute({ id: transaction.id, userId: 'user-2', patch: { amount: 10 } }),
    ).rejects.toThrow(TransactionNotFoundError);
  });
});
