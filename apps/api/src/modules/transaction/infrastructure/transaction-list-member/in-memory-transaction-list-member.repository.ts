import { Injectable } from '@nestjs/common';
import type { TransactionListRole } from '../../domain/transaction-list/transaction-list.js';
import type { TransactionListMember } from '../../domain/transaction-list-member/transaction-list-member.js';
import { TransactionListMemberRepository } from '../../domain/transaction-list-member/transaction-list-member.repository.js';

@Injectable()
export class InMemoryTransactionListMemberRepository extends TransactionListMemberRepository {
  private readonly members: TransactionListMember[] = [];

  async find(listId: string, userId: string): Promise<TransactionListMember | null> {
    return this.members.find((member) => member.listId === listId && member.userId === userId) ?? null;
  }

  async findAll(listId: string): Promise<TransactionListMember[]> {
    return this.members
      .filter((member) => member.listId === listId)
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  }

  async create(listId: string, userId: string, role: TransactionListRole): Promise<void> {
    this.members.push({ listId, userId, role, joinedAt: new Date() });
  }

  async updateRole(listId: string, userId: string, role: TransactionListRole): Promise<void> {
    const member = await this.find(listId, userId);
    if (member) member.role = role;
  }

  async remove(listId: string, userId: string): Promise<void> {
    const index = this.members.findIndex((member) => member.listId === listId && member.userId === userId);
    if (index !== -1) this.members.splice(index, 1);
  }

  async transferOwnership(listId: string, fromUserId: string, toUserId: string): Promise<void> {
    const newOwner = await this.find(listId, toUserId);
    if (newOwner) newOwner.role = 'owner';
    await this.remove(listId, fromUserId);
  }

  // Test helper — not part of the port, only used to set up fixtures.
  seedMember(listId: string, userId: string, role: TransactionListRole, joinedAt = new Date()): void {
    this.members.push({ listId, userId, role, joinedAt });
  }
}
