import { fail } from "../../domain/errors/transaction.errors";
import type { TransactionRepository } from "../../domain/repositories/transaction.repository";

export class GetTransactionUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(userId: string, id: string) {
    const transaction = await this.transactionRepository.findOwned(userId, id);
    if (!transaction) return fail("not_found");
    return { transaction };
  }
}
