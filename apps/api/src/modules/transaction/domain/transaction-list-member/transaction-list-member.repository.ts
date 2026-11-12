import type { TransactionListRole } from '../transaction-list/transaction-list.js';
import type { TransactionListMember } from './transaction-list-member.js';

export abstract class TransactionListMemberRepository {
  abstract find(listId: string, userId: string): Promise<TransactionListMember | null>;

  abstract findAll(listId: string): Promise<TransactionListMember[]>;

  abstract create(listId: string, userId: string, role: TransactionListRole): Promise<void>;

  abstract updateRole(listId: string, userId: string, role: TransactionListRole): Promise<void>;

  abstract remove(listId: string, userId: string): Promise<void>;

  abstract transferOwnership(listId: string, fromUserId: string, toUserId: string): Promise<void>;
}
