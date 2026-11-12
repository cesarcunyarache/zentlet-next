import type { Account } from './account.js';

export abstract class AccountRepository {
  abstract findByProvider(providerId: string, accountId: string): Promise<Account | null>;
  abstract findCredentialByUserId(userId: string): Promise<Account | null>;
  abstract create(account: Account): Promise<Account>;
}
