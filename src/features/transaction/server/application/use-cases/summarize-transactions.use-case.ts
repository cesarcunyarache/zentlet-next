import type { TransactionSummaryQuery } from "../../../schemas/transaction-api.schema";
import type { TransactionSummaryResponse } from "../../../types";
import type { TransactionRepository } from "../../domain/repositories/transaction.repository";

export class SummarizeTransactionsUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(
    userId: string,
    query: TransactionSummaryQuery,
  ): Promise<TransactionSummaryResponse> {
    const { ids, ...filters } = query;

    const [summary, presentIds] = await Promise.all([
      this.transactionRepository.summarize(userId, filters),
      this.transactionRepository.findExistingIds(userId, ids),
    ]);

    return { ...summary, presentIds };
  }
}
