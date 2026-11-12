import { Injectable } from '@nestjs/common';
import type { EmailInbox as EmailInboxRow } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { EmailInbox, EmailVerification } from '../../domain/email-inbox/email-inbox.js';
import { EmailInboxRepository } from '../../domain/email-inbox/email-inbox.repository.js';
import { isUniqueViolation } from '../db-errors.js';

function toDomain(row: EmailInboxRow): EmailInbox {
  return {
    id: row.id,
    userId: row.userId,
    address: row.address,
    verificationCode: row.verificationCode,
    verificationUrl: row.verificationUrl,
    lastReceivedAt: row.lastReceivedAt,
  };
}

@Injectable()
export class PrismaEmailInboxRepository extends EmailInboxRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByUser(userId: string): Promise<EmailInbox | null> {
    const row = await this.prisma.emailInbox.findUnique({ where: { userId } });
    return row ? toDomain(row) : null;
  }

  async findByAddresses(addresses: string[]): Promise<EmailInbox | null> {
    const row = await this.prisma.emailInbox.findFirst({ where: { address: { in: addresses } } });
    return row ? toDomain(row) : null;
  }

  async insert(userId: string, address: string): Promise<EmailInbox | 'conflict'> {
    try {
      const row = await this.prisma.emailInbox.create({ data: { userId, address } });
      return toDomain(row);
    } catch (error) {
      if (isUniqueViolation(error)) return 'conflict';
      throw error;
    }
  }

  async recordReceipt(id: string, receivedAt: Date, verification: EmailVerification | null): Promise<void> {
    const verificationFields = verification ? { verificationCode: verification.code, verificationUrl: verification.url } : {};
    await this.prisma.emailInbox.update({ where: { id }, data: { lastReceivedAt: receivedAt, ...verificationFields } });
  }
}
