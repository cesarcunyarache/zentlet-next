import prisma from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/db-errors";
import { Prisma } from "@/generated/prisma/client";
import type { Conversation } from "../../../../types";
import type { WhatsappRepository } from "../../../domain/repositories/whatsapp.repository";
import { toDomain } from "./whatsapp.mapper";

export class PrismaWhatsappRepository implements WhatsappRepository {
  async findByUser(userId: string) {
    const row = await prisma.whatsappLink.findUnique({ where: { userId } });
    return row ? toDomain(row) : null;
  }

  async findByPhone(phone: string) {
    const row = await prisma.whatsappLink.findUnique({ where: { phone } });
    return row ? toDomain(row) : null;
  }

  async saveLinkCode(userId: string, codeHash: string, expiresAt: Date) {
    await prisma.$transaction([
      prisma.whatsappLinkCode.deleteMany({ where: { userId } }),
      prisma.whatsappLinkCode.create({ data: { userId, codeHash, expiresAt } }),
    ]);
  }

  async consumeLinkCode(codeHash: string, now: Date) {
    const code = await prisma.whatsappLinkCode.findUnique({ where: { codeHash } });
    if (!code) return null;
    const { count } = await prisma.whatsappLinkCode.deleteMany({ where: { codeHash } });
    return count > 0 && code.expiresAt > now ? code.userId : null;
  }

  async link(userId: string, phone: string) {
    await prisma.$transaction([
      prisma.whatsappLink.deleteMany({ where: { phone, userId: { not: userId } } }),
      prisma.whatsappLink.upsert({
        where: { userId },
        create: { userId, phone },
        update: { phone, conversation: Prisma.DbNull, conversationExpiresAt: null, createdAt: new Date() },
      }),
    ]);
  }

  async unlinkUser(userId: string) {
    const { count } = await prisma.whatsappLink.deleteMany({ where: { userId } });
    return count > 0;
  }

  async saveConversation(userId: string, conversation: Conversation, expiresAt: Date, now: Date) {
    await prisma.whatsappLink.updateMany({
      where: { userId },
      data: {
        conversation: conversation as unknown as Prisma.InputJsonValue,
        conversationExpiresAt: expiresAt,
        lastMessageAt: now,
      },
    });
  }

  async markMessageSeen(messageId: string) {
    try {
      await prisma.whatsappMessage.create({ data: { id: messageId } });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }
}
