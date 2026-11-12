import { Injectable } from '@nestjs/common';
import { RecurringTransactionRepository } from '../../../domain/recurring-transaction/recurring-transaction.repository.js';
import { RecurringTransactionNotFoundError } from '../../../domain/recurring.errors.js';
import type { StopRecurringTransactionInput } from './stop-recurring-transaction.input.js';

@Injectable()
export class StopRecurringTransactionUseCase {
  constructor(private readonly recurringTransactionRepository: RecurringTransactionRepository) {}

  async execute(input: StopRecurringTransactionInput): Promise<void> {
    const stopped = await this.recurringTransactionRepository.deleteOwned(input.id, input.userId);
    if (!stopped) throw new RecurringTransactionNotFoundError(input.id);
  }
}
