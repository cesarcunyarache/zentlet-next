import { Injectable } from '@nestjs/common';
import { TransactionRepository } from '../../../domain/transaction/transaction.repository.js';
import type { SummarizeTransactionsInput } from './summarize-transactions.input.js';
import type { SummarizeTransactionsOutput } from './summarize-transactions.output.js';

/**
 * Stable, intentionally minimal surface: the Budget module injects this use
 * case directly to compute "spent so far" against a budget limit.
 */
@Injectable()
export class SummarizeTransactionsUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(input: SummarizeTransactionsInput): Promise<SummarizeTransactionsOutput> {
    return this.transactionRepository.summarize({
      userId: input.userId,
      type: input.type,
      categoryId: input.categoryId,
      listId: input.listId,
      from: input.from,
      to: input.to,
    });
  }
}
