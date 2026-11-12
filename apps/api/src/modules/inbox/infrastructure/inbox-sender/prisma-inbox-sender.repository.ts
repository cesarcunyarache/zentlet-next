import { Injectable } from '@nestjs/common';
import type { InboxSender as InboxSenderRow } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { InboxSender } from '../../domain/inbox-sender/inbox-sender.js';
import { InboxSenderRepository } from '../../domain/inbox-sender/inbox-sender.repository.js';

function toDomain(row: InboxSenderRow): InboxSender {
  return {
    id: row.id,
    userId: row.userId,
    address: row.address,
    status: row.status,
    origin: row.origin,
    acceptedCount: row.acceptedCount,
    dismissedCount: row.dismissedCount,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PrismaInboxSenderRepository extends InboxSenderRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(userId: string): Promise<InboxSender[]> {
    const rows = await this.prisma.inboxSender.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    return rows.map(toDomain);
  }

  async findRules(userId: string): Promise<InboxSender[]> {
    const rows = await this.prisma.inboxSender.findMany({ where: { userId } });
    return rows.map(toDomain);
  }

  async trust(userId: string, address: string): Promise<InboxSender> {
    const row = await this.prisma.inboxSender.upsert({
      where: { userId_address: { userId, address } },
      create: { userId, address, status: 'trusted', origin: 'manual' },
      update: { status: 'trusted', origin: 'manual' },
    });
    return toDomain(row);
  }

  async recordAcceptance(userId: string, address: string): Promise<InboxSender> {
    const row = await this.prisma.inboxSender.upsert({
      where: { userId_address: { userId, address } },
      create: { userId, address, status: 'trusted', origin: 'learned', acceptedCount: 1 },
      update: { acceptedCount: { increment: 1 } },
    });
    return toDomain(row);
  }

  async recordDismissal(userId: string, address: string): Promise<InboxSender> {
    const row = await this.prisma.inboxSender.upsert({
      where: { userId_address: { userId, address } },
      create: { userId, address, status: 'trusted', origin: 'learned', dismissedCount: 1 },
      update: { dismissedCount: { increment: 1 } },
    });
    return toDomain(row);
  }

  async block(id: string): Promise<void> {
    await this.prisma.inboxSender.update({ where: { id }, data: { status: 'blocked' } });
  }

  async deleteOwned(userId: string, id: string): Promise<'deleted' | 'not_found'> {
    const { count } = await this.prisma.inboxSender.deleteMany({ where: { id, userId } });
    return count === 0 ? 'not_found' : 'deleted';
  }
}
