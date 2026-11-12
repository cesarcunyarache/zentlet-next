import { Injectable } from '@nestjs/common';
import type { MerchantRule } from '../../domain/merchant-rule/merchant-rule.js';
import { MerchantRuleRepository } from '../../domain/merchant-rule/merchant-rule.repository.js';

@Injectable()
export class InMemoryMerchantRuleRepository extends MerchantRuleRepository {
  private readonly rules = new Map<string, MerchantRule>();

  async find(userId: string, key: string) {
    const rule = this.rules.get(`${userId}:${key}`);
    return rule ? { categoryId: rule.categoryId, description: rule.description } : null;
  }

  async upsert(userId: string, key: string, categoryId: string, description: string): Promise<void> {
    const id = `${userId}:${key}`;
    const existing = this.rules.get(id);
    const now = new Date();
    this.rules.set(id, {
      id: existing?.id ?? crypto.randomUUID(),
      userId,
      key,
      categoryId,
      description,
      hits: (existing?.hits ?? 0) + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }
}
