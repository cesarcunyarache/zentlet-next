import { beforeEach, describe, expect, it } from 'vitest';
import type { Budget } from '../../../domain/budget/budget.js';
import { BudgetNotFoundError } from '../../../domain/budget.errors.js';
import { InMemoryBudgetAlertRepository } from '../../../infrastructure/budget-alert/in-memory-budget-alert.repository.js';
import { InMemoryBudgetLimitRepository } from '../../../infrastructure/budget-limit/in-memory-budget-limit.repository.js';
import { InMemoryBudgetRepository } from '../../../infrastructure/budget/in-memory-budget.repository.js';
import { GetBudgetUseCase } from './get-budget.use-case.js';

const USER_ID = 'user-1';

const budget: Budget = {
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
};

async function setup() {
  const budgetRepository = new InMemoryBudgetRepository();
  const budgetLimitRepository = new InMemoryBudgetLimitRepository();
  const budgetAlertRepository = new InMemoryBudgetAlertRepository();

  await budgetRepository.create(budget);
  await budgetLimitRepository.append({ budgetId: 'b1', effectiveFrom: new Date('2026-09-01'), amount: 600 });
  await budgetAlertRepository.replaceAllForBudget('b1', [{ kind: 'percent', value: 80 }]);

  return { useCase: new GetBudgetUseCase(budgetRepository, budgetLimitRepository, budgetAlertRepository) };
}

describe('GetBudgetUseCase', () => {
  let useCase: GetBudgetUseCase;

  beforeEach(async () => {
    ({ useCase } = await setup());
  });

  it('gets a budget by id, together with its limits and alerts', async () => {
    const result = await useCase.execute({ userId: USER_ID, id: 'b1' });

    expect(result.budget).toEqual(budget);
    expect(result.limits).toEqual([{ budgetId: 'b1', effectiveFrom: new Date('2026-09-01'), amount: 600 }]);
    expect(result.alerts).toEqual([{ id: expect.any(String), budgetId: 'b1', kind: 'percent', value: 80 }]);
  });

  it('gets a budget by list and category', async () => {
    const result = await useCase.execute({ userId: USER_ID, listId: 'list-1', categoryId: 'food' });

    expect(result.budget).toEqual(budget);
  });

  it('throws when the budget does not exist or is not owned by this user', async () => {
    await expect(useCase.execute({ userId: 'user-2', id: 'b1' })).rejects.toThrow(BudgetNotFoundError);
    await expect(useCase.execute({ userId: USER_ID, listId: 'list-1', categoryId: 'other' })).rejects.toThrow(BudgetNotFoundError);
  });
});
