import { fail } from "../../domain/errors/transaction.errors";
import type { TransactionRepository } from "../../domain/repositories/transaction.repository";

export class DeleteTransactionUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(userId: string, id: string) {
    const result = await this.transactionRepository.deleteOwned(userId, id);
    if (result === "not_found") return fail("not_found");
    return { ok: true as const };
  }
}
