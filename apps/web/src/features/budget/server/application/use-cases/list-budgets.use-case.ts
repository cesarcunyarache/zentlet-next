import type { BudgetRepository } from "../../domain/repositories/budget.repository";

export class ListBudgetsUseCase {
  constructor(private readonly budgetRepository: BudgetRepository) {}

  execute(userId: string) {
    return this.budgetRepository.findAll(userId);
  }
}
