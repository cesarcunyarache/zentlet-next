import type { TransactionSummaryQuery } from "../../schemas/transaction-api.schema";
import type { TransactionSummaryResponse } from "../../types";
import type { TransactionRepository } from "../domain/transaction.repository";

export class SummarizeTransactionsUseCase {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(userId: string, query: TransactionSummaryQuery): Promise<TransactionSummaryResponse> {
    const { ids, ...range } = query;
    const [summary, presentIds] = await Promise.all([
      this.transactions.summarize(userId, range),
      this.transactions.findExistingIds(userId, ids),
    ]);
    return { ...summary, presentIds };
  }
}
