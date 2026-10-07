import { fail } from "../domain/transaction.errors";
import type { TransactionRepository } from "../domain/transaction.repository";

export class GetTransactionUseCase {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(userId: string, id: string) {
    const transaction = await this.transactions.findOwned(userId, id);
    return transaction ? { transaction } : fail("not_found");
  }
}
