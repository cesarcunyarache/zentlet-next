import type {
  DateRange,
  TransactionFilters,
  TransactionSummary,
} from "../../types";
import type {
  FeedCursor,
  NewTransaction,
  Transaction,
  TransactionChanges,
} from "./transaction.entity";

export interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;

  findOwned(userId: string, id: string): Promise<Transaction | null>;

  findFeed(
    userId: string,
    filters: TransactionFilters,
    after: FeedCursor | null,
    take: number,
  ): Promise<Transaction[]>;

  summarize(userId: string, range: DateRange): Promise<TransactionSummary>;

  findExistingIds(userId: string, ids: string[]): Promise<string[]>;

  insert(transaction: NewTransaction): Promise<Transaction | "id_taken">;

  updateOwned(
    userId: string,
    id: string,
    changes: TransactionChanges,
  ): Promise<Transaction | "not_found" | "category_not_found">;

  deleteOwned(userId: string, id: string): Promise<boolean>;

  categoryBelongsTo(userId: string, categoryId: string): Promise<boolean>;
}
