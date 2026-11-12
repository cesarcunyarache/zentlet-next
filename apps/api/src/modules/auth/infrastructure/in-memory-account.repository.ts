import { Injectable } from '@nestjs/common';
import type { Account } from '../domain/account.js';
import { AccountRepository } from '../domain/account.repository.js';

@Injectable()
export class InMemoryAccountRepository extends AccountRepository {
  private readonly accounts: Account[] = [];

  async findByProvider(providerId: string, accountId: string): Promise<Account | null> {
    return (
      this.accounts.find((account) => account.providerId === providerId && account.accountId === accountId) ?? null
    );
  }

  async findCredentialByUserId(userId: string): Promise<Account | null> {
    return this.accounts.find((account) => account.userId === userId && account.providerId === 'credential') ?? null;
  }

  async create(account: Account): Promise<Account> {
    this.accounts.push(account);
    return account;
  }
}
