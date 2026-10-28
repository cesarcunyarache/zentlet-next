import { fail } from "../../domain/errors/recurring.errors";
import type { RecurringTransactionRepository } from "../../domain/repositories/recurring-transaction.repository";

export class GetRecurringTransactionUseCase {
  constructor(private readonly recurringTransactionRepository: RecurringTransactionRepository) {}

  async execute(userId: string, id: string) {
    const recurring = await this.recurringTransactionRepository.findOwned(userId, id);
    if (!recurring) return fail("not_found");
    return { recurring };
  }
}
