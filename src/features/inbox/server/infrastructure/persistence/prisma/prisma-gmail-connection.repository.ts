import prisma from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/db-errors";
import type { GmailConnectionData } from "../../../domain/entities/gmail-connection.entity";
import type { GmailConnectionRepository } from "../../../domain/repositories/gmail-connection.repository";
import { gmailConnectionToDomain } from "./inbox.mapper";

export class PrismaGmailConnectionRepository implements GmailConnectionRepository {
  async findByUser(userId: string) {
    const row = await prisma.gmailConnection.findUnique({ where: { userId } });
    if (!row) return null;
    return gmailConnectionToDomain(row);
  }

  async findByEmail(email: string) {
    const row = await prisma.gmailConnection.findUnique({ where: { email } });
    if (!row) return null;
    return gmailConnectionToDomain(row);
  }

  async findActive() {
    const rows = await prisma.gmailConnection.findMany({ where: { status: "active" } });
    return rows.map(gmailConnectionToDomain);
  }

  async save(userId: string, { sealedRefreshToken, ...connection }: GmailConnectionData) {
    const data = { ...connection, refreshToken: sealedRefreshToken };
    try {
      await prisma.gmailConnection.upsert({ where: { userId }, create: { userId, ...data }, update: data });
      return "saved" as const;
    } catch (error) {
      if (isUniqueViolation(error)) return "taken" as const;
      throw error;
    }
  }

  async markRevoked(id: string) {
    await prisma.gmailConnection.update({ where: { id }, data: { status: "revoked" } });
  }

  async saveProgress(id: string, historyId: bigint) {
    await Promise.all([
      prisma.gmailConnection.updateMany({
        where: { id, OR: [{ historyId: null }, { historyId: { lt: historyId } }] },
        data: { historyId },
      }),
      prisma.gmailConnection.update({ where: { id }, data: { lastSyncedAt: new Date() } }),
    ]);
  }

  async updateWatchExpiry(id: string, watchExpiresAt: Date) {
    await prisma.gmailConnection.update({ where: { id }, data: { watchExpiresAt } });
  }

  async deleteById(id: string) {
    await prisma.gmailConnection.deleteMany({ where: { id } });
  }
}
