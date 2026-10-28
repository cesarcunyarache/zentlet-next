import { fail } from "../../domain/errors/budget.errors";
import type { BudgetRepository } from "../../domain/repositories/budget.repository";

export class ListBudgetAlertsUseCase {
  constructor(private readonly budgetRepository: BudgetRepository) {}

  async execute(userId: string, id: string) {
    const alerts = await this.budgetRepository.findAlerts(userId, id);
    if (!alerts) return fail("not_found");
    return { alerts };
  }
}
