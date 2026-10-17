import prisma from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/db-errors";
import type { EmailVerification } from "../../../domain/entities/email-inbox.entity";
import type { EmailInboxRepository } from "../../../domain/repositories/email-inbox.repository";
import { emailInboxToDomain } from "./inbox.mapper";

export class PrismaEmailInboxRepository implements EmailInboxRepository {
  async findByUser(userId: string) {
    const row = await prisma.emailInbox.findUnique({ where: { userId } });
    if (!row) return null;
    return emailInboxToDomain(row);
  }

  async findByAddresses(addresses: string[]) {
    const row = await prisma.emailInbox.findFirst({ where: { address: { in: addresses } } });
    if (!row) return null;
    return emailInboxToDomain(row);
  }

  async insert(userId: string, address: string) {
    try {
      const row = await prisma.emailInbox.create({ data: { userId, address } });
      return emailInboxToDomain(row);
    } catch (error) {
      if (isUniqueViolation(error)) return "conflict" as const;
      throw error;
    }
  }

  async recordReceipt(id: string, receivedAt: Date, verification: EmailVerification | null) {
    const verificationFields = verification
      ? { verificationCode: verification.code, verificationUrl: verification.url }
      : {};

    await prisma.emailInbox.update({
      where: { id },
      data: { lastReceivedAt: receivedAt, ...verificationFields },
    });
  }
}
