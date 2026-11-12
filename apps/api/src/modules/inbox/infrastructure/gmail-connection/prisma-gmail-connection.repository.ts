import { Injectable } from '@nestjs/common';
import type { GmailConnection as GmailConnectionRow } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { GmailConnection, GmailConnectionData } from '../../domain/gmail-connection/gmail-connection.js';
import { GmailConnectionRepository } from '../../domain/gmail-connection/gmail-connection.repository.js';
import { isUniqueViolation } from '../db-errors.js';

function toDomain(row: GmailConnectionRow): GmailConnection {
  return {
    id: row.id,
    userId: row.userId,
    email: row.email,
    sealedRefreshToken: row.refreshToken,
    status: row.status,
    historyId: row.historyId,
    watchExpiresAt: row.watchExpiresAt,
    lastSyncedAt: row.lastSyncedAt,
  };
}

@Injectable()
export class PrismaGmailConnectionRepository extends GmailConnectionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByUser(userId: string): Promise<GmailConnection | null> {
    const row = await this.prisma.gmailConnection.findUnique({ where: { userId } });
    return row ? toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<GmailConnection | null> {
    const row = await this.prisma.gmailConnection.findUnique({ where: { email } });
    return row ? toDomain(row) : null;
  }

  async findActive(): Promise<GmailConnection[]> {
    const rows = await this.prisma.gmailConnection.findMany({ where: { status: 'active' } });
    return rows.map(toDomain);
  }

  async save(userId: string, { sealedRefreshToken, ...connection }: GmailConnectionData): Promise<'saved' | 'taken'> {
    const data = { ...connection, refreshToken: sealedRefreshToken };
    try {
      await this.prisma.gmailConnection.upsert({ where: { userId }, create: { userId, ...data }, update: data });
      return 'saved';
    } catch (error) {
      if (isUniqueViolation(error)) return 'taken';
      throw error;
    }
  }

  async markRevoked(id: string): Promise<void> {
    await this.prisma.gmailConnection.update({ where: { id }, data: { status: 'revoked' } });
  }

  async saveProgress(id: string, historyId: bigint): Promise<void> {
    const onlyMovesForward = { OR: [{ historyId: null }, { historyId: { lt: historyId } }] };
    await Promise.all([
      this.prisma.gmailConnection.updateMany({ where: { id, ...onlyMovesForward }, data: { historyId } }),
      this.prisma.gmailConnection.update({ where: { id }, data: { lastSyncedAt: new Date() } }),
    ]);
  }

  async updateWatchExpiry(id: string, watchExpiresAt: Date): Promise<void> {
    await this.prisma.gmailConnection.update({ where: { id }, data: { watchExpiresAt } });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.gmailConnection.deleteMany({ where: { id } });
  }
}
