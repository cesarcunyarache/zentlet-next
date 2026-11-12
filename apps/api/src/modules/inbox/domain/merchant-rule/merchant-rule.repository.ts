import type { MerchantRuleMatch } from './merchant-rule.js';

export abstract class MerchantRuleRepository {
  abstract find(userId: string, key: string): Promise<MerchantRuleMatch | null>;
  abstract upsert(userId: string, key: string, categoryId: string, description: string): Promise<void>;
}
