import type { UpdateTransactionInput } from "../../schemas/transaction-api.schema";
import { isExpense, type TransactionChanges } from "../domain/transaction.entity";
import { fail } from "../domain/transaction.errors";
import type { BudgetMonitor } from "../domain/transaction.ports";
import type { TransactionRepository } from "../domain/transaction.repository";

function toChanges(input: UpdateTransactionInput): TransactionChanges {
  const { transactionDate, ...fields } = input;
  return { ...fields, transactionDate: transactionDate ? new Date(transactionDate) : undefined };
}

export class UpdateTransactionUseCase {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly budget: BudgetMonitor,
  ) {}

  async execute(userId: string, id: string, input: UpdateTransactionInput) {
    if (input.categoryId && !(await this.transactions.categoryBelongsTo(userId, input.categoryId))) {
      return fail("category_not_found");
    }

    const updated = await this.transactions.updateOwned(userId, id, toChanges(input));
    if (typeof updated === "string") return fail(updated);

    if (isExpense(updated)) this.budget.scheduleCheck(userId, updated.categoryId);
    return { transaction: updated };
  }
}
