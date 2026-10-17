import type { SummaryFilters, TransactionFilters, TransactionSummary } from "../../../types";
import type { FeedCursor, NewTransaction, Transaction, TransactionChanges } from "../entities/transaction.entity";

export interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;

  findOwned(userId: string, id: string): Promise<Transaction | null>;

  findFeed(userId: string, filters: TransactionFilters, after: FeedCursor | null, take: number): Promise<Transaction[]>;

  summarize(userId: string, filters: SummaryFilters): Promise<TransactionSummary>;

  findExistingIds(userId: string, ids: string[]): Promise<string[]>;

  insert(transaction: NewTransaction): Promise<Transaction | "id_taken">;

  updateOwned(
    userId: string,
    id: string,
    changes: TransactionChanges,
  ): Promise<Transaction | "not_found" | "category_not_found">;

  deleteOwned(userId: string, id: string): Promise<"deleted" | "not_found">;

  categoryBelongsTo(userId: string, categoryId: string): Promise<boolean>;
}
