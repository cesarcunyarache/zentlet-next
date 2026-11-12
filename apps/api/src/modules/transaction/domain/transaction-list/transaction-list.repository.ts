import type { ListMembership, NewTransactionList, TransactionList } from './transaction-list.js';

export abstract class TransactionListRepository {
  abstract findPrivateList(userId: string): Promise<TransactionList | null>;

  /** Create-if-absent: must survive a concurrent double-create for the same `userId`. */
  abstract ensurePrivateList(userId: string): Promise<TransactionList>;

  abstract findMembership(listId: string, userId: string): Promise<ListMembership | null>;

  abstract findById(listId: string): Promise<TransactionList | null>;

  abstract create(list: NewTransactionList): Promise<TransactionList | 'id_taken'>;
}
