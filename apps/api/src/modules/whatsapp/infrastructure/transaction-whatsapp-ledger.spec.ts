import { describe, expect, it, vi } from 'vitest';
import type { Logger } from '../../../shared/logger/domain/logger.js';
import type { Category } from '../../category/domain/category.js';
import type { CreateTransactionInput } from '../../transaction/application/use-cases/create-transaction/create-transaction.input.js';
import type { CreateTransactionOutput } from '../../transaction/application/use-cases/create-transaction/create-transaction.output.js';
import { TransactionWhatsappLedger } from './transaction-whatsapp-ledger.js';

const CATEGORY: Category = {
  id: 'cat-1',
  userId: 'user-1',
  name: 'Groceries',
  icon: 'cart',
  color: '#000',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildFakeDeps() {
  // Simulates the real CreateTransactionUseCase's idempotent-by-id behavior:
  // the same id is only ever stored once, regardless of how many times
  // record() is called with it.
  const store = new Map<string, CreateTransactionOutput['transaction']>();
  const execute = vi.fn(async (input: CreateTransactionInput): Promise<CreateTransactionOutput> => {
    const existing = input.id ? store.get(input.id) : undefined;
    if (existing) return { transaction: existing, created: false };

    const transaction: CreateTransactionOutput['transaction'] = {
      id: input.id ?? 'generated-id',
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      categoryId: input.categoryId,
      description: input.description ?? null,
      reference: null,
      transactionDate: input.transactionDate,
      recurringTransactionId: null,
      listId: 'list-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    store.set(transaction.id, transaction);
    return { transaction, created: true };
  });

  const listCategories = { execute: vi.fn(async () => [CATEGORY]) } as unknown as {
    execute: (input: { userId: string }) => Promise<Category[]>;
  };
  const createTransaction = { execute } as unknown as { execute: typeof execute };
  const logError = vi.fn();
  const logger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: logError };

  return { store, execute, listCategories, createTransaction, logger, logError };
}

describe('TransactionWhatsappLedger', () => {
  it('lists categories scoped to the given user via ListCategoriesUseCase', async () => {
    const { listCategories, createTransaction, logger } = buildFakeDeps();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ledger = new TransactionWhatsappLedger(listCategories as any, createTransaction as any, logger);

    const categories = await ledger.categories('user-1');

    expect(categories).toEqual([{ id: 'cat-1', name: 'Groceries' }]);
  });

  it('recording the same movementId twice never creates a second transaction', async () => {
    const { store, execute, listCategories, createTransaction, logger } = buildFakeDeps();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ledger = new TransactionWhatsappLedger(listCategories as any, createTransaction as any, logger);
    const movement = { type: 'expense' as const, amount: 1500, categoryId: 'cat-1', description: 'Coffee' };

    const first = await ledger.record('user-1', 'movement-1', movement);
    const second = await ledger.record('user-1', 'movement-1', movement);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(store.size).toBe(1);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[0][0].id).toBe('movement-1');
    expect(execute.mock.calls[1][0].id).toBe('movement-1');
  });

  it('returns false and logs instead of throwing when the transaction use-case rejects the call', async () => {
    const { listCategories, logger, logError } = buildFakeDeps();
    const createTransaction = { execute: vi.fn().mockRejectedValue(new Error('category not owned')) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ledger = new TransactionWhatsappLedger(listCategories as any, createTransaction as any, logger);

    const result = await ledger.record('user-1', 'movement-1', {
      type: 'expense',
      amount: 1500,
      categoryId: 'cat-1',
      description: 'Coffee',
    });

    expect(result).toBe(false);
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', movementId: 'movement-1' }),
      'whatsapp.record_failed',
    );
  });
});
