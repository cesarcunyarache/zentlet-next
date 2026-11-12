import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/infrastructure/prisma.service.js';
import { WhatsappMessageRepository } from '../domain/whatsapp-message/whatsapp-message.repository.js';
import { isUniqueViolation } from './db-errors.js';

@Injectable()
export class PrismaWhatsappMessageRepository extends WhatsappMessageRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async markSeen(id: string): Promise<boolean> {
    try {
      await this.prisma.whatsappMessage.create({ data: { id } });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }
}
