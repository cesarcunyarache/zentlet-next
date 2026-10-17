import type { CreateTransactionInput } from "../../schemas/transaction-api.schema";
import { isExpense, type NewTransaction } from "../domain/transaction.entity";
import { fail } from "../domain/transaction.errors";
import type {
  BudgetMonitor,
  ListPlacement,
  RecurringSeries,
} from "../domain/transaction.ports";
import type { TransactionRepository } from "../domain/transaction.repository";

function toNewTransaction(
  userId: string,
  input: CreateTransactionInput,
  listId: string,
): NewTransaction {
  return {
    id: input.id,
    userId,
    description: input.description,
    amount: input.amount,
    type: input.type,
    categoryId: input.categoryId,
    reference: input.reference ?? null,
    transactionDate: new Date(input.transactionDate),
    listId,
  };
}

export class CreateTransactionUseCase {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly recurring: RecurringSeries,
    private readonly budget: BudgetMonitor,
    private readonly lists: ListPlacement,
  ) {}

  async execute(userId: string, input: CreateTransactionInput) {
    const existing = await this.transactions.findById(input.id);
    if (existing)
      return existing.userId === userId
        ? { transaction: existing, created: false }
        : fail("id_taken");

    if (!(await this.transactions.categoryBelongsTo(userId, input.categoryId)))
      return fail("category_not_found");

    const requestedListId = input.recurrence ? null : (input.listId ?? null);
    const listId = await this.lists.targetFor(userId, requestedListId);
    const draft = toNewTransaction(userId, input, listId);
    const created = input.recurrence
      ? await this.recurring.start(draft, input.recurrence)
      : await this.transactions.insert(draft);

    if (created === "id_taken") return this.concurrentWinner(userId, input.id);

    if (isExpense(created))
      this.budget.scheduleCheck(userId, created.categoryId);
    return { transaction: created, created: true };
  }

  private async concurrentWinner(userId: string, id: string) {
    const winner = await this.transactions.findOwned(userId, id);
    return winner ? { transaction: winner, created: false } : fail("id_taken");
  }
}
