import { fail } from "../../domain/errors/budget.errors";
import type { BudgetRepository } from "../../domain/repositories/budget.repository";

export class DeleteBudgetUseCase {
  constructor(private readonly budgetRepository: BudgetRepository) {}

  async execute(userId: string, id: string) {
    const result = await this.budgetRepository.deleteOwned(userId, id);
    if (result === "not_found") return fail("not_found");
    return { ok: true as const };
  }
}
