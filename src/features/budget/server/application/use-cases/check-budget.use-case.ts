import { isoDateIn } from "@/lib/dates";
import { dueBudgetNotice, noticeKeyPrefix } from "../../../lib/alerts";
import { activePeriod, limitAt } from "../../../lib/period";
import { serializeBudget } from "../../../lib/serialize";
import type { BudgetWithAlerts } from "../../domain/entities/budget.entity";
import type { AccountPreferences, BudgetNotifier } from "../../domain/ports/budget.ports";
import type { BudgetRepository } from "../../domain/repositories/budget.repository";

type Preferences = Awaited<ReturnType<AccountPreferences["find"]>>;

export class CheckBudgetUseCase {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly accountPreferences: AccountPreferences,
    private readonly budgetNotifier: BudgetNotifier,
  ) {}

  async execute(userId: string, categoryId: string) {
    const [budgets, preferences] = await Promise.all([
      this.budgetRepository.findByCategory(userId, categoryId),
      this.accountPreferences.find(userId),
    ]);

    await Promise.all(budgets.map((budget) => this.checkListBudget(userId, budget, preferences)));
  }

  private async checkListBudget(userId: string, budget: BudgetWithAlerts, { currency, timezone }: Preferences) {
    const serialized = serializeBudget(budget);
    const userToday = isoDateIn(timezone);

    const period = activePeriod(serialized, userToday);
    if (!period) return;

    const limit = limitAt(serialized, period.from);
    if (limit === null) return;

    const [spent, sentKeys] = await Promise.all([
      this.budgetRepository.spentIn(userId, budget.categoryId, budget.listId, period),
      this.budgetNotifier.sentKeys(userId, noticeKeyPrefix(budget.id, period.from)),
    ]);

    const notice = dueBudgetNotice({
      budgetId: budget.id,
      periodFrom: period.from,
      spent,
      limit,
      alerts: budget.alerts,
      sentKeys,
    });
    if (!notice) return;

    const data = {
      budgetId: budget.id,
      categoryName: budget.categoryName,
      currency,
      spent,
      limit,
      periodFrom: period.from,
    };
    await this.budgetNotifier.notify({ ...notice, userId, data });
  }
}
