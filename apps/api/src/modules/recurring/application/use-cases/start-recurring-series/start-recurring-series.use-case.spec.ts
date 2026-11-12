import { beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../../../../../shared/prisma/infrastructure/prisma.service.js';
import { CategoryNotOwnedError, InvalidRecurringAmountError } from '../../../domain/recurring.errors.js';
import { InMemoryRecurringTransactionRepository } from '../../../infrastructure/recurring-transaction/in-memory-recurring-transaction.repository.js';
import { StartRecurringSeriesUseCase } from './start-recurring-series.use-case.js';

const USER_ID = 'user-1';
const CATEGORY_ID = 'category-1';
const LIST_ID = 'list-1';

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
  const recurringTransactionRepository = new InMemoryRecurringTransactionRepository();
  const prisma = makePrismaStub(ownedCategoryIds) as unknown as PrismaService;
  return {
    useCase: new StartRecurringSeriesUseCase(recurringTransactionRepository, prisma),
    recurringTransactionRepository,
  };
}

function baseInput(overrides: Partial<Parameters<StartRecurringSeriesUseCase['execute']>[0]> = {}) {
  return {
    userId: USER_ID,
    type: 'expense' as const,
    amount: 45,
    categoryId: CATEGORY_ID,
    frequency: 'MONTHLY' as const,
    anchorDate: new Date('2026-01-31T00:00:00.000Z'),
    listId: LIST_ID,
    ...overrides,
  };
}

describe('StartRecurringSeriesUseCase', () => {
  let setup: ReturnType<typeof makeUseCase>;

  beforeEach(() => {
    setup = makeUseCase();
  });

  it('creates the template and its first occurrence on the anchor date', async () => {
    const { useCase } = setup;

    const result = await useCase.execute(baseInput());

    expect(result.recurringTransaction.userId).toBe(USER_ID);
    expect(result.recurringTransaction.anchorDate.toISOString().slice(0, 10)).toBe('2026-01-31');
    expect(result.transactionId).toBeTruthy();
  });

  it('never backfills past periods for a backdated anchor: the first due date is strictly after today', async () => {
    const { useCase } = setup;
    const todayUtc = new Date(new Date().toISOString().slice(0, 10));
    const farInThePast = new Date('2020-01-31T00:00:00.000Z');

    const result = await useCase.execute(baseInput({ anchorDate: farInThePast }));

    expect(result.recurringTransaction.nextDueDate.getTime()).toBeGreaterThan(todayUtc.getTime());
  });

  it('computes the first due date as the next occurrence strictly after a future anchor', async () => {
    const { useCase } = setup;
    const future = new Date(Date.now() + 365 * 86_400_000);

    const result = await useCase.execute(baseInput({ anchorDate: future }));

    expect(result.recurringTransaction.nextDueDate.getTime()).toBeGreaterThan(
      result.recurringTransaction.anchorDate.getTime(),
    );
  });

  it('persists the first transaction with the caller-resolved listId so later occurrences can reuse it', async () => {
    const { useCase, recurringTransactionRepository } = setup;
    const farInThePast = new Date('2020-01-31T00:00:00.000Z');

    const result = await useCase.execute(baseInput({ anchorDate: farInThePast }));
    const farFuture = new Date(result.recurringTransaction.nextDueDate.getTime() + 1);
    const due = await recurringTransactionRepository.findDueBy(farFuture);

    expect(due).toHaveLength(1);
    expect(due[0]?.listId).toBe(LIST_ID);
  });

  it('rejects a non-positive amount', async () => {
    const { useCase } = setup;

    await expect(useCase.execute(baseInput({ amount: 0 }))).rejects.toThrow(InvalidRecurringAmountError);
    await expect(useCase.execute(baseInput({ amount: -5 }))).rejects.toThrow(InvalidRecurringAmountError);
  });

  it('rejects a category that does not belong to the user', async () => {
    const setupWithoutCategory = makeUseCase(new Set());

    await expect(setupWithoutCategory.useCase.execute(baseInput())).rejects.toThrow(CategoryNotOwnedError);
  });
});
