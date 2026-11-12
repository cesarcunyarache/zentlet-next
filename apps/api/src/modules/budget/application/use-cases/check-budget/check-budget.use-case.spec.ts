import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SummarizeTransactionsUseCase } from '../../../../transaction/application/use-cases/summarize-transactions/summarize-transactions.use-case.js';
import type { Budget } from '../../../domain/budget/budget.js';
import type { BudgetNotification, BudgetNotifier } from '../../../domain/budget-notifier.js';
import { BudgetNotFoundError } from '../../../domain/budget.errors.js';
import { InMemoryBudgetAlertRepository } from '../../../infrastructure/budget-alert/in-memory-budget-alert.repository.js';
import { InMemoryBudgetLimitRepository } from '../../../infrastructure/budget-limit/in-memory-budget-limit.repository.js';
import { InMemoryBudgetRepository } from '../../../infrastructure/budget/in-memory-budget.repository.js';
import { CheckBudgetUseCase } from './check-budget.use-case.js';

const USER_ID = 'user-1';
const NOW = new Date('2026-10-01T03:00:00.000Z');

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

async function setup(overrides: Partial<Budget> = {}, spent = 0) {
  const budgetRepository = new InMemoryBudgetRepository();
  const budgetLimitRepository = new InMemoryBudgetLimitRepository();
  const budgetAlertRepository = new InMemoryBudgetAlertRepository();
  const executeSpy = vi.fn().mockResolvedValue({ total: spent });
  const notifySpy = vi.fn();
  const summarize = { execute: executeSpy } as unknown as SummarizeTransactionsUseCase;
  const notifier = { notify: notifySpy } as unknown as BudgetNotifier;

  const stored = { ...budget, ...overrides };
  await budgetRepository.create(stored);
  await budgetLimitRepository.append({ budgetId: stored.id, effectiveFrom: new Date('2026-09-01'), amount: 1000 });
  await budgetAlertRepository.replaceAllForBudget(stored.id, [{ kind: 'percent', value: 80 }]);

  const useCase = new CheckBudgetUseCase(budgetRepository, budgetLimitRepository, budgetAlertRepository, summarize, notifier);
  return { useCase, executeSpy, notifySpy };
}

describe('CheckBudgetUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('notifies the reached alert for the active period', async () => {
    const { useCase, executeSpy, notifySpy } = await setup({}, 850);

    const result = await useCase.execute({ userId: USER_ID, budgetId: 'b1' });

    expect(result).toEqual({ checked: true, spent: 850, limit: 1000, notified: true });
    expect(executeSpy).toHaveBeenCalledWith({
      userId: USER_ID,
      type: 'expense',
      categoryId: 'food',
      listId: 'list-1',
      from: new Date('2026-10-01T00:00:00.000Z'),
      to: new Date(new Date('2026-11-01T00:00:00.000Z').getTime() - 1),
    });
    expect(notifySpy).toHaveBeenCalledWith({
      userId: USER_ID,
      budgetId: 'b1',
      categoryId: 'food',
      periodFrom: '2026-10-01',
      spent: 850,
      limit: 1000,
      notice: { kind: 'alert', alertId: expect.any(String), threshold: 800 },
    } satisfies BudgetNotification);
  });

  it('does not notify when nothing is crossed', async () => {
    const { useCase, notifySpy } = await setup({}, 400);

    const result = await useCase.execute({ userId: USER_ID, budgetId: 'b1' });

    expect(result).toEqual({ checked: true, spent: 400, limit: 1000, notified: false });
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it('does not check before the budget has started', async () => {
    const { useCase, executeSpy } = await setup({ startDate: new Date('2026-11-01') });

    const result = await useCase.execute({ userId: USER_ID, budgetId: 'b1' });

    expect(result).toEqual({ checked: false });
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it('throws when the budget does not exist or is not owned by this user', async () => {
    const { useCase } = await setup();

    await expect(useCase.execute({ userId: 'user-2', budgetId: 'b1' })).rejects.toThrow(BudgetNotFoundError);
  });
});
