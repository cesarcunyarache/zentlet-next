import { vi } from "vitest";
import type { NewTransaction, Transaction } from "../../../domain/entities/transaction.entity";
import type { TransactionRepository } from "../../../domain/repositories/transaction.repository";

export function stored(draft: NewTransaction, recurringTransactionId: string | null = null): Transaction {
  return { ...draft, recurringTransactionId, createdAt: new Date() };
}

export function fakeRepository(overrides: Partial<TransactionRepository> = {}): TransactionRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findOwned: vi.fn().mockResolvedValue(null),
    findFeed: vi.fn().mockResolvedValue([]),
    summarize: vi.fn(),
    findExistingIds: vi.fn().mockResolvedValue([]),
    insert: vi.fn(async (draft: NewTransaction) => stored(draft)),
    updateOwned: vi.fn(),
    deleteOwned: vi.fn().mockResolvedValue("deleted"),
    categoryBelongsTo: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}
