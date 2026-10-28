import type { MerchantRule } from "../entities/merchant-rule.entity";

export interface MerchantRuleRepository {
  find(userId: string, key: string): Promise<MerchantRule | null>;
}
