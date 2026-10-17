import type { CreateTransactionInput } from "../../../schemas/transaction-api.schema";
import {
  isExpense,
  type NewTransaction,
} from "../../domain/entities/transaction.entity";
import { fail } from "../../domain/errors/transaction.errors";
import type {
  BudgetMonitor,
  ListPlacement,
  RecurringSeries,
} from "../../domain/ports/transaction.ports";
import type { TransactionRepository } from "../../domain/repositories/transaction.repository";

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

function requestedListId(input: CreateTransactionInput) {
  const isRecurringSeries = Boolean(input.recurrence);
  if (isRecurringSeries) return null;
  return input.listId ?? null;
}

export class CreateTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly recurringSeries: RecurringSeries,
    private readonly budgetMonitor: BudgetMonitor,
    private readonly listPlacement: ListPlacement,
  ) {}

  async execute(userId: string, input: CreateTransactionInput) {
    const existing = await this.transactionRepository.findById(input.id);

    if (existing) {
      const belongsToAnotherUser = existing.userId !== userId;
      if (belongsToAnotherUser) return fail("id_taken");
      return { transaction: existing, created: false };
    }

    const ownsCategory = await this.transactionRepository.categoryBelongsTo(
      userId,
      input.categoryId,
    );

    if (!ownsCategory) return fail("category_not_found");

    const listId = await this.listPlacement.targetFor(
      userId,
      requestedListId(input),
    );

    const created = await this.save(
      toNewTransaction(userId, input, listId),
      input.recurrence,
    );

    if (created === "id_taken")
      return this.findRetriedCreation(userId, input.id);

    if (isExpense(created))
      this.budgetMonitor.scheduleCheck(userId, created.categoryId);

    return { transaction: created, created: true };
  }

  private save(
    draft: NewTransaction,
    recurrence: CreateTransactionInput["recurrence"],
  ) {
    if (recurrence) return this.recurringSeries.start(draft, recurrence);
    return this.transactionRepository.insert(draft);
  }

  private async findRetriedCreation(userId: string, id: string) {
    const transaction = await this.transactionRepository.findOwned(userId, id);
    if (!transaction) return fail("id_taken");
    return { transaction, created: false };
  }
}
