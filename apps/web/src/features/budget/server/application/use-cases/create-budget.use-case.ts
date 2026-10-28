import { DEFAULT_ALERTS } from "../../../lib/alerts";
import type { CreateBudgetInput } from "../../../schemas/budget-api.schema";
import type { NewBudget } from "../../domain/entities/budget.entity";
import { fail } from "../../domain/errors/budget.errors";
import type { ListPlacement } from "../../domain/ports/budget.ports";
import type { BudgetRepository } from "../../domain/repositories/budget.repository";

function toNewBudget(userId: string, input: CreateBudgetInput): NewBudget {
  return {
    id: input.id,
    userId,
    categoryId: input.categoryId,
    listId: input.listId,
    kind: input.kind,
    periodUnit: input.periodUnit,
    periodCount: input.periodCount,
    startDate: new Date(input.startDate),
    initialLimit: input.amount,
    alerts: DEFAULT_ALERTS,
  };
}

export class CreateBudgetUseCase {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly listPlacement: ListPlacement,
  ) {}

  async execute(userId: string, input: CreateBudgetInput) {
    const existing = await this.budgetRepository.findById(input.id);

    if (existing) {
      const belongsToAnotherUser = existing.userId !== userId;
      if (belongsToAnotherUser) return fail("id_taken");
      return { budget: existing, created: false };
    }

    const ownsCategory = await this.budgetRepository.categoryBelongsTo(userId, input.categoryId);
    if (!ownsCategory) return fail("category_not_found");

    const canUseList = await this.listPlacement.accepts(userId, input.listId);
    if (!canUseList) return fail("list_not_found");

    const created = await this.budgetRepository.insert(toNewBudget(userId, input));
    if (created === "already_exists") return this.findRetriedCreation(userId, input.id);

    return { budget: created, created: true };
  }

  private async findRetriedCreation(userId: string, id: string) {
    const budget = await this.budgetRepository.findOwned(userId, id);
    if (!budget) return fail("category_has_budget");
    return { budget, created: false };
  }
}
