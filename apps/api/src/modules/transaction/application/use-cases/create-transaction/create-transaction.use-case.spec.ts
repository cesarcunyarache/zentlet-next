import { beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../../../../../shared/prisma/infrastructure/prisma.service.js';
import { InvalidTransactionAmountError, TransactionIdTakenError } from '../../../domain/transaction.errors.js';
import { InMemoryTransactionListRepository } from '../../../infrastructure/transaction-list/in-memory-transaction-list.repository.js';
import { InMemoryTransactionRepository } from '../../../infrastructure/transaction/in-memory-transaction.repository.js';
import { ListPlacementService } from '../../services/list-placement.service.js';
import { CreateTransactionUseCase } from './create-transaction.use-case.js';

const USER_ID = 'user-1';
const CATEGORY_ID = 'category-1';

function makePrismaStub(ownedCategoryIds: Set<string>) {
  return {
    category: {
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => {
        if (where.userId !== USER_ID) return null;
        return ownedCategoryIds.has(where.id) ? { id: where.id } : null;
      },
    },
  };
}

function makeUseCase(ownedCategoryIds: Set<string> = new Set([CATEGORY_ID])) {
  const transactionRepository = new InMemoryTransactionRepository();
  const transactionListRepository = new InMemoryTransactionListRepository();
  const listPlacement = new ListPlacementService(transactionListRepository);
  const prisma = makePrismaStub(ownedCategoryIds) as unknown as PrismaService;

  return {
    useCase: new CreateTransactionUseCase(transactionRepository, listPlacement, prisma),
    transactionRepository,
    transactionListRepository,
  };
}

function baseInput(overrides: Partial<Parameters<CreateTransactionUseCase['execute']>[0]> = {}) {
  return {
    userId: USER_ID,
    type: 'expense' as const,
    amount: 100,
    categoryId: CATEGORY_ID,
    transactionDate: new Date('2024-01-15'),
    ...overrides,
  };
}

describe('CreateTransactionUseCase', () => {
  let setup: ReturnType<typeof makeUseCase>;

  beforeEach(() => {
    setup = makeUseCase();
  });

  it('creates a transaction and places it in the caller private list when none was requested', async () => {
    const { useCase, transactionListRepository } = setup;

    const result = await useCase.execute(baseInput());

    expect(result.created).toBe(true);
    expect(result.transaction.userId).toBe(USER_ID);
    expect(result.transaction.amount).toBe(100);

    const privateList = await transactionListRepository.findPrivateList(USER_ID);
    expect(privateList?.id).toBe(result.transaction.listId);
  });

  it('is idempotent: retrying with the same id and user returns the existing transaction', async () => {
    const { useCase } = setup;
    const id = crypto.randomUUID();

    const first = await useCase.execute(baseInput({ id }));
    const second = await useCase.execute(baseInput({ id, amount: 999 }));

    expect(second.created).toBe(false);
    expect(second.transaction).toEqual(first.transaction);
  });

  it('rejects an id that already belongs to another user', async () => {
    const { useCase } = setup;
    const id = crypto.randomUUID();

    await useCase.execute(baseInput({ id }));

    await expect(useCase.execute(baseInput({ id, userId: 'user-2' }))).rejects.toThrow(TransactionIdTakenError);
  });

  it('rejects a non-positive amount', async () => {
    const { useCase } = setup;

    await expect(useCase.execute(baseInput({ amount: 0 }))).rejects.toThrow(InvalidTransactionAmountError);
    await expect(useCase.execute(baseInput({ amount: -5 }))).rejects.toThrow(InvalidTransactionAmountError);
  });

  it('rejects a category that does not belong to the user', async () => {
    const setupWithoutCategory = makeUseCase(new Set());

    await expect(setupWithoutCategory.useCase.execute(baseInput())).rejects.toThrow(/category/i);
  });
});
