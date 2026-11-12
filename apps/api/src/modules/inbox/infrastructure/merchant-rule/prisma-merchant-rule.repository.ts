import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { MerchantRuleMatch } from '../../domain/merchant-rule/merchant-rule.js';
import { MerchantRuleRepository } from '../../domain/merchant-rule/merchant-rule.repository.js';

@Injectable()
export class PrismaMerchantRuleRepository extends MerchantRuleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async find(userId: string, key: string): Promise<MerchantRuleMatch | null> {
    return this.prisma.merchantRule.findUnique({
      where: { userId_key: { userId, key } },
      select: { categoryId: true, description: true },
    });
  }

  async upsert(userId: string, key: string, categoryId: string, description: string): Promise<void> {
    await this.prisma.merchantRule.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, categoryId, description },
      update: { categoryId, description, hits: { increment: 1 } },
    });
  }
}
