import type {
  EntryCursor,
  ListBreakdown,
  ListChanges,
  ListEntry,
  ListOverview,
  NewTransactionList,
  TransactionList,
} from "./list.entity";

export interface ListRepository {
  findById(listId: string): Promise<TransactionList | null>;

  findOverviews(userId: string): Promise<ListOverview[]>;

  findBreakdown(listId: string): Promise<ListBreakdown>;

  findOwnedIds(ownerId: string): Promise<string[]>;

  ensurePrivate(userId: string): Promise<string>;

  insert(list: NewTransactionList): Promise<TransactionList | "id_taken">;

  update(listId: string, changes: ListChanges): Promise<TransactionList>;

  delete(listId: string): Promise<void>;

  findEntries(listId: string, after: EntryCursor | null, take: number): Promise<ListEntry[]>;

  findEntryAuthor(listId: string, transactionId: string): Promise<string | null>;

  countOwnedTransactions(userId: string, transactionIds: string[]): Promise<number>;

  assign(listId: string, userId: string, transactionIds: string[]): Promise<number>;

  unassign(listId: string, transactionId: string): Promise<boolean>;
}
