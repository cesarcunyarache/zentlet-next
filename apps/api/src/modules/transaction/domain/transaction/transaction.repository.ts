import type { FeedCursor, Transaction, TransactionFilters, TransactionPatch } from './transaction.js';

export abstract class TransactionRepository {
  abstract create(transaction: Transaction): Promise<Transaction | 'id_taken'>;

  abstract update(id: string, userId: string, patch: TransactionPatch): Promise<Transaction | null>;

  abstract delete(id: string, userId: string): Promise<boolean>;

  abstract findById(id: string): Promise<Transaction | null>;

  abstract findOwned(id: string, userId: string): Promise<Transaction | null>;

  abstract findFeed(filters: TransactionFilters, after: FeedCursor | null, take: number): Promise<Transaction[]>;

  abstract summarize(filters: TransactionFilters): Promise<{ total: number }>;
}
