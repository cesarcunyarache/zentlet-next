import { describe, expect, it } from 'vitest';
import type { RecurringTransaction } from '../../../domain/recurring-transaction/recurring-transaction.js';
import { RecurringTransactionNotFoundError } from '../../../domain/recurring.errors.js';
import { InMemoryRecurringTransactionRepository } from '../../../infrastructure/recurring-transaction/in-memory-recurring-transaction.repository.js';
import { StopRecurringTransactionUseCase } from './stop-recurring-transaction.use-case.js';

const USER_ID = 'user-1';

function seedTemplate(repository: InMemoryRecurringTransactionRepository): RecurringTransaction {
  const now = new Date();
  const template: RecurringTransaction = {
    id: 'rec-1',
    userId: USER_ID,
    type: 'expense',
    amount: 45,
    description: null,
    categoryId: 'category-1',
    frequency: 'MONTHLY',
    anchorDate: new Date('2026-09-06'),
    nextDueDate: new Date('2026-10-06'),
    createdAt: now,
    updatedAt: now,
  };
  repository.seedTemplate(template, 'list-1');
  return template;
}

describe('StopRecurringTransactionUseCase', () => {
  it('deletes an owned template', async () => {
    const repository = new InMemoryRecurringTransactionRepository();
    const template = seedTemplate(repository);
    const useCase = new StopRecurringTransactionUseCase(repository);

    await useCase.execute({ id: template.id, userId: USER_ID });

    expect(await repository.findDueBy(new Date('2100-01-01'))).toEqual([]);
  });

  it('throws when the template does not exist', async () => {
    const repository = new InMemoryRecurringTransactionRepository();
    const useCase = new StopRecurringTransactionUseCase(repository);

    await expect(useCase.execute({ id: 'missing', userId: USER_ID })).rejects.toThrow(RecurringTransactionNotFoundError);
  });

  it('throws when the template belongs to another user, and leaves it untouched', async () => {
    const repository = new InMemoryRecurringTransactionRepository();
    const template = seedTemplate(repository);
    const useCase = new StopRecurringTransactionUseCase(repository);

    await expect(useCase.execute({ id: template.id, userId: 'user-2' })).rejects.toThrow(
      RecurringTransactionNotFoundError,
    );
    expect(await repository.findDueBy(new Date('2100-01-01'))).toHaveLength(1);
  });

  it('does not touch already-generated transactions when stopping (the DB handles that via onDelete: SetNull)', async () => {
    const repository = new InMemoryRecurringTransactionRepository();
    const template = seedTemplate(repository);
    const useCase = new StopRecurringTransactionUseCase(repository);
    const before = repository.occurrenceCount(template.id);

    await useCase.execute({ id: template.id, userId: USER_ID });

    expect(repository.occurrenceCount(template.id)).toBe(before);
  });
});
