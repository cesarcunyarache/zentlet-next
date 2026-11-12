import { Injectable } from '@nestjs/common';
import type { InboxTransaction as InboxTransactionRow } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type {
  AcceptedInboxTransactionDraft,
  DateWindow,
  EmailMovement,
  InboxTransaction,
  MatchableCategory,
  NewInboxTransaction,
} from '../../domain/inbox-transaction/inbox-transaction.js';
import { InboxTransactionRepository } from '../../domain/inbox-transaction/inbox-transaction.repository.js';
import { isUniqueViolation } from '../db-errors.js';

const MAX_PENDING = 100;

function toDomain(row: InboxTransactionRow): InboxTransaction {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    externalId: row.externalId,
    senderAddress: row.senderAddress,
    bank: row.bank,
    subject: row.subject,
    parser: row.parser,
    isVerified: row.isVerified,
    isNewSender: row.isNewSender,
    type: row.type,
    amount: row.amount ? row.amount.toNumber() : null,
    currency: row.currency,
    merchant: row.merchant,
    description: row.description,
    categoryId: row.categoryId,
    isLearned: row.isLearned,
    transactionDate: row.transactionDate,
    cardLast4: row.cardLast4,
    reference: row.reference,
    duplicateOfId: row.duplicateOfId,
    transactionId: row.transactionId,
    resolvedAt: row.resolvedAt,
    receivedAt: row.receivedAt,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PrismaInboxTransactionRepository extends InboxTransactionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findPending(userId: string): Promise<InboxTransaction[]> {
    const rows = await this.prisma.inboxTransaction.findMany({
      where: { userId, status: 'pending' },
      orderBy: [{ transactionDate: 'desc' }, { receivedAt: 'desc' }],
      take: MAX_PENDING,
    });
    return rows.map(toDomain);
  }

  async findPendingOwned(userId: string, id: string): Promise<InboxTransaction | null> {
    const row = await this.prisma.inboxTransaction.findFirst({ where: { id, userId, status: 'pending' } });
    return row ? toDomain(row) : null;
  }

  async hasReference(userId: string, reference: string, amount: number): Promise<boolean> {
    const existing = await this.prisma.inboxTransaction.findFirst({ where: { userId, reference, amount }, select: { id: true } });
    return existing !== null;
  }

  async insert(item: NewInboxTransaction): Promise<'created' | 'duplicate'> {
    try {
      await this.prisma.inboxTransaction.create({ data: item });
      return 'created';
    } catch (error) {
      if (isUniqueViolation(error)) return 'duplicate';
      throw error;
    }
  }

  async categoryBelongsTo(userId: string, categoryId: string): Promise<boolean> {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
    return category !== null;
  }

  async findMatchableCategories(userId: string): Promise<MatchableCategory[]> {
    return this.prisma.category.findMany({ where: { userId }, select: { id: true, name: true, icon: true, color: true } });
  }

  async findSimilarTransactionId(userId: string, movement: EmailMovement, window: DateWindow): Promise<string | null> {
    const match = await this.prisma.transaction.findFirst({
      where: { userId, type: movement.type, amount: movement.amount, transactionDate: { gte: window.from, lte: window.to } },
      select: { id: true },
    });
    return match?.id ?? null;
  }

  async markDismissed(id: string): Promise<void> {
    await this.prisma.inboxTransaction.update({ where: { id }, data: { status: 'dismissed', resolvedAt: new Date() } });
  }

  async markAccepted(item: InboxTransaction, draft: AcceptedInboxTransactionDraft): Promise<void> {
    await this.prisma.inboxTransaction.update({
      where: { id: item.id },
      data: { status: 'accepted', categoryId: draft.categoryId, resolvedAt: new Date() },
    });
  }
}
