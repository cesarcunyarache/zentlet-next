import { describe, expect, it } from 'vitest';
import { TransactionListIdTakenError } from '../../../domain/transaction-list.errors.js';
import { InMemoryTransactionListRepository } from '../../../infrastructure/transaction-list/in-memory-transaction-list.repository.js';
import { CreateTransactionListUseCase } from './create-transaction-list.use-case.js';

const USER_ID = 'user-1';

function baseInput(overrides: Partial<Parameters<CreateTransactionListUseCase['execute']>[0]> = {}) {
  return {
    id: crypto.randomUUID(),
    userId: USER_ID,
    name: 'Trip to Cusco',
    icon: '🏔️',
    color: '#D6E8F7',
    currency: 'PEN',
    ...overrides,
  };
}

function makeUseCase() {
  const transactionListRepository = new InMemoryTransactionListRepository();
  return { useCase: new CreateTransactionListUseCase(transactionListRepository), transactionListRepository };
}

describe('CreateTransactionListUseCase', () => {
  it('creates a shared list with the caller as owner', async () => {
    const { useCase, transactionListRepository } = makeUseCase();
    const input = baseInput();

    const result = await useCase.execute(input);

    expect(result.created).toBe(true);
    expect(result.list.ownerId).toBe(USER_ID);
    expect(result.list.privateOwnerId).toBeNull();

    const membership = await transactionListRepository.findMembership(input.id, USER_ID);
    expect(membership?.role).toBe('owner');
  });

  it('is idempotent: retrying with the same id and user returns the existing list', async () => {
    const { useCase } = makeUseCase();
    const input = baseInput();

    const first = await useCase.execute(input);
    const second = await useCase.execute({ ...input, name: 'Different name' });

    expect(second.created).toBe(false);
    expect(second.list).toEqual(first.list);
  });

  it('rejects an id that already belongs to another user', async () => {
    const { useCase } = makeUseCase();
    const input = baseInput();

    await useCase.execute(input);

    await expect(useCase.execute({ ...input, userId: 'user-2' })).rejects.toThrow(TransactionListIdTakenError);
  });
});
