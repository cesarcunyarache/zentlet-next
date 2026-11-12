import { Injectable } from '@nestjs/common';
import { TransactionListIdTakenError } from '../../../domain/transaction-list.errors.js';
import { TransactionListRepository } from '../../../domain/transaction-list/transaction-list.repository.js';
import type { CreateTransactionListInput } from './create-transaction-list.input.js';
import type { CreateTransactionListOutput } from './create-transaction-list.output.js';

@Injectable()
export class CreateTransactionListUseCase {
  constructor(private readonly transactionListRepository: TransactionListRepository) {}

  async execute(input: CreateTransactionListInput): Promise<CreateTransactionListOutput> {
    const existing = await this.transactionListRepository.findById(input.id);
    if (existing) {
      if (existing.ownerId !== input.userId) throw new TransactionListIdTakenError(input.id);
      return { list: existing, created: false };
    }

    const created = await this.transactionListRepository.create({
      id: input.id,
      ownerId: input.userId,
      name: input.name,
      icon: input.icon,
      color: input.color,
      currency: input.currency,
    });
    if (created !== 'id_taken') return { list: created, created: true };

    // Lost the race between our existence check and the insert: another
    // request with the same id landed first.
    const retried = await this.transactionListRepository.findById(input.id);
    if (!retried) throw new TransactionListIdTakenError(input.id);
    return { list: retried, created: false };
  }
}
