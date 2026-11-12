import { Injectable } from '@nestjs/common';
import { TransactionRepository } from '../../../domain/transaction/transaction.repository.js';
import { TransactionNotFoundError } from '../../../domain/transaction.errors.js';
import type { DeleteTransactionInput } from './delete-transaction.input.js';

@Injectable()
export class DeleteTransactionUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  /** Throws when the transaction doesn't exist or isn't owned by `userId` — deletion is not a no-op here. */
  async execute(input: DeleteTransactionInput): Promise<void> {
    const deleted = await this.transactionRepository.delete(input.id, input.userId);
    if (!deleted) throw new TransactionNotFoundError(input.id);
  }
}
