export type MerchantRule = {
  id: string;
  userId: string;
  key: string;
  categoryId: string;
  description: string;
  hits: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MerchantRuleMatch = Pick<MerchantRule, 'categoryId' | 'description'>;
