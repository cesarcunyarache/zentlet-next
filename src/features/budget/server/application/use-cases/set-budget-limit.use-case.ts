import { isPeriodStart } from "../../../lib/period";
import type { BudgetLimitInput } from "../../../schemas/budget-api.schema";
import type { BudgetSchedule } from "../../domain/entities/budget.entity";
import { fail } from "../../domain/errors/budget.errors";
import type { BudgetMonitor } from "../../domain/ports/budget.ports";
import type { BudgetRepository } from "../../domain/repositories/budget.repository";

function isOutsideSinglePeriod(schedule: BudgetSchedule, start: Date) {
  if (schedule.kind !== "once") return false;
  return start.getTime() !== schedule.startDate.getTime();
}

export class SetBudgetLimitUseCase {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly budgetMonitor: BudgetMonitor,
  ) {}

  async execute(userId: string, id: string, effectiveFrom: string, { amount }: BudgetLimitInput) {
    const schedule = await this.budgetRepository.findSchedule(userId, id);
    if (!schedule) return fail("not_found");

    if (!isPeriodStart(schedule, effectiveFrom)) return fail("invalid_period_start");

    const start = new Date(effectiveFrom);
    if (start < schedule.startDate) return fail("limit_before_start");
    if (isOutsideSinglePeriod(schedule, start)) return fail("single_period");

    const saved = await this.budgetRepository.setLimit(id, start, amount);
    if (saved === "not_found") return fail("not_found");

    const updated = await this.budgetRepository.findById(id);
    if (!updated) return fail("not_found");

    this.budgetMonitor.scheduleCheck(userId, updated.categoryId);

    return { budget: updated };
  }
}
