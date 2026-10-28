import type { BudgetAlert, PeriodRange } from "../../../types";
import type {
  Budget,
  BudgetCurrentLimit,
  BudgetSchedule,
  BudgetWithAlerts,
  NewBudget,
  NewBudgetAlert,
} from "../entities/budget.entity";

export interface BudgetRepository {
  findAll(userId: string): Promise<Budget[]>;

  findById(id: string): Promise<Budget | null>;

  findOwned(userId: string, id: string): Promise<Budget | null>;

  findSchedule(userId: string, id: string): Promise<BudgetSchedule | null>;

  findCurrentLimit(userId: string, id: string): Promise<BudgetCurrentLimit | null>;

  findByCategory(userId: string, categoryId: string): Promise<BudgetWithAlerts[]>;

  findAlerts(userId: string, id: string): Promise<BudgetAlert[] | null>;

  insert(budget: NewBudget): Promise<Budget | "already_exists">;

  setLimit(id: string, effectiveFrom: Date, amount: number): Promise<"saved" | "not_found">;

  replaceAlerts(id: string, alerts: NewBudgetAlert[]): Promise<BudgetAlert[] | "not_found">;

  deleteOwned(userId: string, id: string): Promise<"deleted" | "not_found">;

  categoryBelongsTo(userId: string, categoryId: string): Promise<boolean>;

  spentIn(userId: string, categoryId: string, listId: string, period: PeriodRange): Promise<number>;
}
