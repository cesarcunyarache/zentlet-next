import prisma from "@/lib/prisma";
import type { MerchantRuleRepository } from "../../../domain/repositories/merchant-rule.repository";

export class PrismaMerchantRuleRepository implements MerchantRuleRepository {
  find(userId: string, key: string) {
    return prisma.merchantRule.findUnique({
      where: { userId_key: { userId, key } },
      select: { categoryId: true, description: true },
    });
  }
}
