import type { UpdateTransactionInput } from "../../../schemas/transaction-api.schema";
import {
  isExpense,
  type TransactionChanges,
} from "../../domain/entities/transaction.entity";
import { fail } from "../../domain/errors/transaction.errors";
import type { BudgetMonitor } from "../../domain/ports/transaction.ports";
import type { TransactionRepository } from "../../domain/repositories/transaction.repository";

function toChanges({
  transactionDate,
  ...fields
}: UpdateTransactionInput): TransactionChanges {
  if (!transactionDate) return { ...fields, transactionDate: undefined };
  return { ...fields, transactionDate: new Date(transactionDate) };
}

export class UpdateTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly budgetMonitor: BudgetMonitor,
  ) {}

  async execute(userId: string, id: string, input: UpdateTransactionInput) {
    if (input.categoryId) {
      const ownsCategory = await this.transactionRepository.categoryBelongsTo(
        userId,
        input.categoryId,
      );
      if (!ownsCategory) return fail("category_not_found");
    }

    const updated = await this.transactionRepository.updateOwned(
      userId,
      id,
      toChanges(input),
    );

    if (updated === "not_found" || updated === "category_not_found")
      return fail(updated);

    if (isExpense(updated))
      this.budgetMonitor.scheduleCheck(userId, updated.categoryId);

    return { transaction: updated };
  }
}
