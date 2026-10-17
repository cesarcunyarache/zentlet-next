import { fail } from "../domain/transaction.errors";
import type { TransactionRepository } from "../domain/transaction.repository";

export class DeleteTransactionUseCase {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(userId: string, id: string) {
    return (await this.transactions.deleteOwned(userId, id)) ? { ok: true as const } : fail("not_found");
  }
}
