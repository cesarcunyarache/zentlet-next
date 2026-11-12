import { describe, expect, it, vi } from 'vitest';
import type { LogContext } from '../../../../../shared/logger/domain/logger.js';
import { Logger } from '../../../../../shared/logger/domain/logger.js';
import type { RecurringTransaction } from '../../../domain/recurring-transaction/recurring-transaction.js';
import { InMemoryRecurringTransactionRepository } from '../../../infrastructure/recurring-transaction/in-memory-recurring-transaction.repository.js';
import { MaterializeDueTransactionsUseCase } from './materialize-due-transactions.use-case.js';

const USER_ID = 'user-1';
const LIST_ID = 'list-1';

class FakeLogger extends Logger {
  debug(_context: LogContext, _message: string): void {}
  info(_context: LogContext, _message: string): void {}
  warn(_context: LogContext, _message: string): void {}
  error(_context: LogContext, _message: string): void {}
}

function template(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  const now = new Date();
  return {
    id: 'rec-1',
    userId: USER_ID,
    type: 'expense',
    amount: 45,
    description: 'Netflix',
    categoryId: 'category-1',
    frequency: 'MONTHLY',
    anchorDate: new Date('2026-09-06T00:00:00.000Z'),
    nextDueDate: new Date('2026-10-06T00:00:00.000Z'),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeUseCase() {
  const recurringTransactionRepository = new InMemoryRecurringTransactionRepository();
  const useCase = new MaterializeDueTransactionsUseCase(recurringTransactionRepository, new FakeLogger());
  return { useCase, recurringTransactionRepository };
}

describe('MaterializeDueTransactionsUseCase', () => {
  it('generates every missed occurrence and advances nextDueDate past the last one', async () => {
    const { useCase, recurringTransactionRepository } = makeUseCase();
    recurringTransactionRepository.seedTemplate(template(), LIST_ID);

    const result = await useCase.execute({ now: new Date('2026-12-06T00:00:00.000Z') });

    expect(result).toEqual({ created: 3, failed: 0 }); // Oct 6, Nov 6, Dec 6
    const due = await recurringTransactionRepository.findDueBy(new Date('2027-01-06T00:00:00.000Z'));
    expect(due[0]?.nextDueDate.toISOString().slice(0, 10)).toBe('2027-01-06');
  });

  it('does nothing when no template is due', async () => {
    const { useCase, recurringTransactionRepository } = makeUseCase();
    recurringTransactionRepository.seedTemplate(template({ nextDueDate: new Date('2027-01-01T00:00:00.000Z') }), LIST_ID);

    const result = await useCase.execute({ now: new Date('2026-12-06T00:00:00.000Z') });

    expect(result).toEqual({ created: 0, failed: 0 });
  });

  it('never double-generates an occurrence it already created when run again for the same date', async () => {
    const { useCase, recurringTransactionRepository } = makeUseCase();
    recurringTransactionRepository.seedTemplate(template(), LIST_ID);
    const now = new Date('2026-10-06T00:00:00.000Z');

    const first = await useCase.execute({ now });
    const second = await useCase.execute({ now });

    expect(first.created).toBe(1);
    expect(second.created).toBe(0);
  });

  it("relies on the in-memory fake's simulated unique-constraint guard directly", async () => {
    const { recurringTransactionRepository } = makeUseCase();
    recurringTransactionRepository.seedTemplate(template(), LIST_ID);

    const occurrence = {
      userId: USER_ID,
      type: 'expense' as const,
      amount: 45,
      description: 'Netflix',
      categoryId: 'category-1',
      transactionDate: new Date('2026-10-06T00:00:00.000Z'),
      recurringTransactionId: 'rec-1',
      listId: LIST_ID,
    };

    const first = await recurringTransactionRepository.recordOccurrences('rec-1', [occurrence], new Date('2026-11-06'));
    const second = await recurringTransactionRepository.recordOccurrences('rec-1', [occurrence], new Date('2026-11-06'));

    expect(first).toBe(1);
    expect(second).toBe(0);
  });

  it('caps a long-overdue template at the 60-occurrence limit and catches up on the next run', async () => {
    const { useCase, recurringTransactionRepository } = makeUseCase();
    // `nextDueDate` starts one week after the anchor, matching how
    // `start-recurring-series` always computes it (strictly after the
    // anchor) — the anchor date itself is already covered by the
    // seeded first occurrence and must not collide with it.
    recurringTransactionRepository.seedTemplate(
      template({
        frequency: 'WEEKLY',
        anchorDate: new Date('2020-01-01T00:00:00.000Z'),
        nextDueDate: new Date('2020-01-08T00:00:00.000Z'),
      }),
      LIST_ID,
    );
    const now = new Date('2026-12-06T00:00:00.000Z');

    const first = await useCase.execute({ now });
    expect(first.created).toBe(60);

    const second = await useCase.execute({ now });
    expect(second.created).toBe(60);
  });

  it('records a failure without aborting other templates', async () => {
    const { useCase, recurringTransactionRepository } = makeUseCase();
    recurringTransactionRepository.seedTemplate(template({ id: 'rec-1' }), LIST_ID);
    recurringTransactionRepository.seedTemplate(template({ id: 'rec-2' }), LIST_ID);
    const failingSpy = vi
      .spyOn(recurringTransactionRepository, 'recordOccurrences')
      .mockImplementationOnce(() => Promise.reject(new Error('db down')));

    const result = await useCase.execute({ now: new Date('2026-10-06T00:00:00.000Z') });

    expect(result.failed).toBe(1);
    expect(result.created).toBe(1);
    failingSpy.mockRestore();
  });
});
