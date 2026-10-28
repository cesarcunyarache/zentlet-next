import { CreateBudgetUseCase } from "../application/use-cases/create-budget.use-case";
import { DeleteBudgetUseCase } from "../application/use-cases/delete-budget.use-case";
import { ListBudgetAlertsUseCase } from "../application/use-cases/list-budget-alerts.use-case";
import { ListBudgetsUseCase } from "../application/use-cases/list-budgets.use-case";
import { ReplaceBudgetAlertsUseCase } from "../application/use-cases/replace-budget-alerts.use-case";
import { SetBudgetLimitUseCase } from "../application/use-cases/set-budget-limit.use-case";
import type { BudgetMonitor } from "../domain/ports/budget.ports";
import { listPlacement } from "./budget.adapters";
import { scheduleBudgetCheck } from "./budget.monitor";
import { PrismaBudgetRepository } from "./persistence/prisma/prisma-budget.repository";

const repository = new PrismaBudgetRepository();

const budgetMonitor: BudgetMonitor = {
  scheduleCheck: scheduleBudgetCheck,
};

export const budgetUseCases = {
  list: new ListBudgetsUseCase(repository),
  create: new CreateBudgetUseCase(repository, listPlacement),
  delete: new DeleteBudgetUseCase(repository),
  setLimit: new SetBudgetLimitUseCase(repository, budgetMonitor),
  listAlerts: new ListBudgetAlertsUseCase(repository),
  replaceAlerts: new ReplaceBudgetAlertsUseCase(repository, budgetMonitor),
};
