import { beforeEach, describe, expect, it } from 'vitest';
import type { Budget } from '../../../domain/budget/budget.js';
import { BudgetNotFoundError, InvalidPeriodStartError, LimitBeforeStartDateError, SinglePeriodLimitError } from '../../../domain/budget.errors.js';
import { InMemoryBudgetLimitRepository } from '../../../infrastructure/budget-limit/in-memory-budget-limit.repository.js';
import { InMemoryBudgetRepository } from '../../../infrastructure/budget/in-memory-budget.repository.js';
import { SetBudgetLimitUseCase } from './set-budget-limit.use-case.js';

const USER_ID = 'user-1';

function budget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    userId: USER_ID,
    categoryId: 'food',
    listId: 'list-1',
    kind: 'recurring',
    periodUnit: 'month',
    periodCount: 1,
    startDate: new Date('2026-09-01'),
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
    ...overrides,
  };
}

async function setupWith(stored: Budget | null) {
  const budgetRepository = new InMemoryBudgetRepository();
  const budgetLimitRepository = new InMemoryBudgetLimitRepository();
  if (stored) await budgetRepository.create(stored);
  return { useCase: new SetBudgetLimitUseCase(budgetRepository, budgetLimitRepository), budgetLimitRepository };
}

describe('SetBudgetLimitUseCase', () => {
  let setup: Awaited<ReturnType<typeof setupWith>>;

  beforeEach(async () => {
    setup = await setupWith(budget());
  });

  it('sets the limit effective from that period start', async () => {
    const { useCase, budgetLimitRepository } = setup;

    const result = await useCase.execute({ userId: USER_ID, budgetId: 'b1', effectiveFrom: new Date('2026-10-01'), amount: 800 });

    expect(result).toEqual({ limit: { budgetId: 'b1', effectiveFrom: new Date('2026-10-01'), amount: 800 } });
    expect(await budgetLimitRepository.findAllByBudgetId('b1')).toEqual([result.limit]);
  });

  it('throws when the budget does not exist or is not owned by this user', async () => {
    const { useCase } = setup;

    await expect(
      useCase.execute({ userId: 'user-2', budgetId: 'b1', effectiveFrom: new Date('2026-10-01'), amount: 800 }),
    ).rejects.toThrow(BudgetNotFoundError);
  });

  it('rejects a date that is not the start of a period', async () => {
    const { useCase } = setup;

    await expect(
      useCase.execute({ userId: USER_ID, budgetId: 'b1', effectiveFrom: new Date('2026-10-15'), amount: 800 }),
    ).rejects.toThrow(InvalidPeriodStartError);
  });

  it('rejects an effective date before the budget started', async () => {
    const { useCase } = setup;

    await expect(
      useCase.execute({ userId: USER_ID, budgetId: 'b1', effectiveFrom: new Date('2026-08-01'), amount: 800 }),
    ).rejects.toThrow(LimitBeforeStartDateError);
  });

  it('rejects a second period for a "once" budget', async () => {
    const once = await setupWith(budget({ kind: 'once' }));

    await expect(
      once.useCase.execute({ userId: USER_ID, budgetId: 'b1', effectiveFrom: new Date('2026-10-01'), amount: 800 }),
    ).rejects.toThrow(SinglePeriodLimitError);
  });
});
