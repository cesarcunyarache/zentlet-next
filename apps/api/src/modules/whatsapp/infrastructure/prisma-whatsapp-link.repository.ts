import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../shared/prisma/infrastructure/prisma.service.js';
import type { Conversation } from '../domain/whatsapp-link/whatsapp-link.js';
import { WhatsappLinkRepository } from '../domain/whatsapp-link/whatsapp-link.repository.js';
import { toWhatsappLink } from './prisma-whatsapp-link.mapper.js';

@Injectable()
export class PrismaWhatsappLinkRepository extends WhatsappLinkRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByUserId(userId: string) {
    const row = await this.prisma.whatsappLink.findUnique({ where: { userId } });
    return row ? toWhatsappLink(row) : null;
  }

  async findByPhone(phone: string) {
    const row = await this.prisma.whatsappLink.findUnique({ where: { phone } });
    return row ? toWhatsappLink(row) : null;
  }

  async link(userId: string, phone: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.whatsappLink.deleteMany({ where: { phone, userId: { not: userId } } }),
      this.prisma.whatsappLink.upsert({
        where: { userId },
        create: { userId, phone },
        update: { phone, conversation: Prisma.DbNull, conversationExpiresAt: null, createdAt: new Date() },
      }),
    ]);
  }

  async unlink(userId: string): Promise<boolean> {
    const { count } = await this.prisma.whatsappLink.deleteMany({ where: { userId } });
    return count > 0;
  }

  async saveConversation(userId: string, conversation: Conversation, expiresAt: Date): Promise<void> {
    await this.prisma.whatsappLink.updateMany({
      where: { userId },
      data: {
        conversation: conversation as unknown as Prisma.InputJsonValue,
        conversationExpiresAt: expiresAt,
        lastMessageAt: new Date(),
      },
    });
  }
}
