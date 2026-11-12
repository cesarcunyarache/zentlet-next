import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { Account } from '../domain/account.js';
import { AccountRepository } from '../domain/account.repository.js';

const CREDENTIAL_PROVIDER_ID = 'credential';

@Injectable()
export class PrismaAccountRepository extends AccountRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByProvider(providerId: string, accountId: string): Promise<Account | null> {
    return this.prisma.account.findFirst({ where: { providerId, accountId } });
  }

  async findCredentialByUserId(userId: string): Promise<Account | null> {
    return this.prisma.account.findFirst({ where: { userId, providerId: CREDENTIAL_PROVIDER_ID } });
  }

  async create(account: Account): Promise<Account> {
    return this.prisma.account.create({ data: account });
  }
}
