import { describe, expect, it } from 'vitest';
import type { Budget } from '../../../domain/budget/budget.js';
import { AlertAboveLimitError, BudgetNotFoundError } from '../../../domain/budget.errors.js';
import { InMemoryBudgetAlertRepository } from '../../../infrastructure/budget-alert/in-memory-budget-alert.repository.js';
import { InMemoryBudgetLimitRepository } from '../../../infrastructure/budget-limit/in-memory-budget-limit.repository.js';
import { InMemoryBudgetRepository } from '../../../infrastructure/budget/in-memory-budget.repository.js';
import { ReplaceBudgetAlertsUseCase } from './replace-budget-alerts.use-case.js';

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
  await budgetLimitRepository.append({ budgetId: 'b1', effectiveFrom: new Date('2026-09-01'), amount: 1000 });

  return {
    useCase: new ReplaceBudgetAlertsUseCase(budgetRepository, budgetLimitRepository, budgetAlertRepository),
    budgetAlertRepository,
  };
}

describe('ReplaceBudgetAlertsUseCase', () => {
  it('replaces the alerts when every threshold stays below the current limit', async () => {
    const { useCase, budgetAlertRepository } = await setup();

    const result = await useCase.execute({ userId: USER_ID, budgetId: 'b1', alerts: [{ kind: 'percent', value: 90 }] });

    expect(result.alerts).toEqual([{ id: expect.any(String), budgetId: 'b1', kind: 'percent', value: 90 }]);
    expect(await budgetAlertRepository.findAllByBudgetId('b1')).toEqual(result.alerts);
  });

  it('rejects an alert at or above the current limit', async () => {
    const { useCase } = await setup();

    await expect(
      useCase.execute({ userId: USER_ID, budgetId: 'b1', alerts: [{ kind: 'amount', value: 1000 }] }),
    ).rejects.toThrow(AlertAboveLimitError);
  });

  it('throws when the budget does not exist or is not owned by this user', async () => {
    const { useCase } = await setup();

    await expect(useCase.execute({ userId: 'user-2', budgetId: 'b1', alerts: [] })).rejects.toThrow(BudgetNotFoundError);
  });
});
