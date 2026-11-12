import { beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../../../../../shared/prisma/infrastructure/prisma.service.js';
import { BudgetIdTakenError, CategoryNotOwnedError, DuplicateBudgetError, TransactionListNotOwnedError } from '../../../domain/budget.errors.js';
import { InMemoryBudgetAlertRepository } from '../../../infrastructure/budget-alert/in-memory-budget-alert.repository.js';
import { InMemoryBudgetLimitRepository } from '../../../infrastructure/budget-limit/in-memory-budget-limit.repository.js';
import { InMemoryBudgetRepository } from '../../../infrastructure/budget/in-memory-budget.repository.js';
import { CreateBudgetUseCase } from './create-budget.use-case.js';

const USER_ID = 'user-1';
const CATEGORY_ID = 'category-1';
const LIST_ID = 'list-1';

function makePrismaStub(ownsCategory: boolean, ownsList: boolean) {
  return {
    category: { findFirst: async () => (ownsCategory ? { id: CATEGORY_ID } : null) },
    transactionList: { findFirst: async () => (ownsList ? { id: LIST_ID } : null) },
  };
}

function makeUseCase(ownsCategory = true, ownsList = true) {
  const budgetRepository = new InMemoryBudgetRepository();
  const budgetLimitRepository = new InMemoryBudgetLimitRepository();
  const budgetAlertRepository = new InMemoryBudgetAlertRepository();
  const prisma = makePrismaStub(ownsCategory, ownsList) as unknown as PrismaService;

  return {
    useCase: new CreateBudgetUseCase(budgetRepository, budgetLimitRepository, budgetAlertRepository, prisma),
    budgetRepository,
    budgetLimitRepository,
    budgetAlertRepository,
  };
}

function baseInput(overrides: Partial<Parameters<CreateBudgetUseCase['execute']>[0]> = {}) {
  return {
    userId: USER_ID,
    categoryId: CATEGORY_ID,
    listId: LIST_ID,
    kind: 'recurring' as const,
    periodUnit: 'month' as const,
    periodCount: 1,
    startDate: new Date('2026-09-01'),
    initialLimitAmount: 600,
    ...overrides,
  };
}

describe('CreateBudgetUseCase', () => {
  let setup: ReturnType<typeof makeUseCase>;

  beforeEach(() => {
    setup = makeUseCase();
  });

  it('creates the budget with its first limit and the default 80% alert', async () => {
    const { useCase, budgetAlertRepository } = setup;

    const result = await useCase.execute(baseInput());

    expect(result.created).toBe(true);
    expect(result.budget).toMatchObject({ userId: USER_ID, categoryId: CATEGORY_ID, listId: LIST_ID });
    expect(result.limit).toMatchObject({ amount: 600, effectiveFrom: new Date('2026-09-01') });

    const alerts = await budgetAlertRepository.findAllByBudgetId(result.budget.id);
    expect(alerts).toEqual([{ id: expect.any(String), budgetId: result.budget.id, kind: 'percent', value: 80 }]);
  });

  it('is idempotent: retrying the same id returns the existing budget', async () => {
    const { useCase } = setup;
    const id = crypto.randomUUID();

    const first = await useCase.execute(baseInput({ id }));
    const second = await useCase.execute(baseInput({ id, initialLimitAmount: 999 }));

    expect(second.created).toBe(false);
    expect(second.budget).toEqual(first.budget);
    expect(second.limit).toEqual(first.limit);
  });

  it('rejects an id that already belongs to another user', async () => {
    const { useCase } = setup;
    const id = crypto.randomUUID();

    await useCase.execute(baseInput({ id }));

    await expect(useCase.execute(baseInput({ id, userId: 'user-2' }))).rejects.toThrow(BudgetIdTakenError);
  });

  it('rejects a category that does not belong to the user', async () => {
    const { useCase } = makeUseCase(false, true);

    await expect(useCase.execute(baseInput())).rejects.toThrow(CategoryNotOwnedError);
  });

  it('rejects a transaction list that does not belong to the user', async () => {
    const { useCase } = makeUseCase(true, false);

    await expect(useCase.execute(baseInput())).rejects.toThrow(TransactionListNotOwnedError);
  });

  it('rejects a second budget for the same list and category', async () => {
    const { useCase } = setup;

    await useCase.execute(baseInput());

    await expect(useCase.execute(baseInput({ startDate: new Date('2026-10-01') }))).rejects.toThrow(DuplicateBudgetError);
  });
});
