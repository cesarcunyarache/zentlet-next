import { fail } from "../../domain/errors/recurring.errors";
import type { RecurringTransactionRepository } from "../../domain/repositories/recurring-transaction.repository";

export class StopRecurringTransactionUseCase {
  constructor(private readonly recurringTransactionRepository: RecurringTransactionRepository) {}

  async execute(userId: string, id: string) {
    const result = await this.recurringTransactionRepository.deleteOwned(userId, id);
    if (result === "not_found") return fail("not_found");
    return { ok: true as const };
  }
}
