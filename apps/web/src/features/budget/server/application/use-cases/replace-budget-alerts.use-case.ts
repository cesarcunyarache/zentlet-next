import { isAlertBelowLimit } from "../../../lib/alerts";
import type { BudgetAlertsInput } from "../../../schemas/budget-api.schema";
import { fail } from "../../domain/errors/budget.errors";
import type { BudgetMonitor } from "../../domain/ports/budget.ports";
import type { BudgetRepository } from "../../domain/repositories/budget.repository";

export class ReplaceBudgetAlertsUseCase {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly budgetMonitor: BudgetMonitor,
  ) {}

  async execute(userId: string, id: string, { alerts }: BudgetAlertsInput) {
    const budget = await this.budgetRepository.findCurrentLimit(userId, id);
    if (!budget) return fail("not_found");

    const allBelowLimit = alerts.every((alert) => isAlertBelowLimit(alert, budget.currentLimit));
    if (!allBelowLimit) return fail("alert_above_limit");

    const saved = await this.budgetRepository.replaceAlerts(id, alerts);
    if (saved === "not_found") return fail("not_found");

    this.budgetMonitor.scheduleCheck(userId, budget.categoryId);

    return { alerts: saved };
  }
}
