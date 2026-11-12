import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/infrastructure/prisma.service.js';
import { WhatsappLinkCodeRepository } from '../domain/whatsapp-link-code/whatsapp-link-code.repository.js';

@Injectable()
export class PrismaWhatsappLinkCodeRepository extends WhatsappLinkCodeRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(userId: string, codeHash: string, expiresAt: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.whatsappLinkCode.deleteMany({ where: { userId } }),
      this.prisma.whatsappLinkCode.create({ data: { userId, codeHash, expiresAt } }),
    ]);
  }

  async consume(codeHash: string, now: Date): Promise<string | null> {
    const code = await this.prisma.whatsappLinkCode.findUnique({ where: { codeHash } });
    if (!code) return null;

    const { count } = await this.prisma.whatsappLinkCode.deleteMany({ where: { codeHash } });
    return count > 0 && code.expiresAt > now ? code.userId : null;
  }
}
