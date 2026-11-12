import { Injectable } from '@nestjs/common';
import type { ListMembership, TransactionList, TransactionListRole } from '../../domain/transaction-list/transaction-list.js';
import { TransactionListRepository } from '../../domain/transaction-list/transaction-list.repository.js';

const CONTRIBUTOR_ROLES: readonly TransactionListRole[] = ['owner', 'editor'];

function canUseRequestedList(membership: ListMembership | null, privateList: TransactionList, userId: string): boolean {
  if (!membership) return false;
  if (membership.list.archivedAt) return false;
  if (!CONTRIBUTOR_ROLES.includes(membership.role)) return false;
  if (membership.list.privateOwnerId === userId) return true;

  return membership.list.currency === privateList.currency;
}

/**
 * Every transaction belongs to a list, and a create must never be rejected for
 * lack of one: this resolves the requested list when the caller can actually
 * contribute to it, and otherwise silently falls back to the caller's private
 * list (created on first use if it doesn't exist yet).
 */
@Injectable()
export class ListPlacementService {
  constructor(private readonly transactionListRepository: TransactionListRepository) {}

  async resolveTargetListId(userId: string, requestedListId: string | null): Promise<string> {
    const privateList = await this.transactionListRepository.ensurePrivateList(userId);
    if (!requestedListId) return privateList.id;

    const membership = await this.transactionListRepository.findMembership(requestedListId, userId);
    if (canUseRequestedList(membership, privateList, userId)) return requestedListId;

    return privateList.id;
  }
}
