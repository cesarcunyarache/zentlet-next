import { APIService } from "@/core/services/api.service";
import type { BudgetKind, BudgetPeriodUnit, TBudget } from "../types";

export interface CreateBudgetPayload {
  id: string;
  categoryId: string;
  kind: BudgetKind;
  periodUnit: BudgetPeriodUnit;
  periodCount: number;
  startDate: string;
  amount: number;
}

class BudgetService extends APIService {
  async getBudgets(): Promise<TBudget[]> {
    const response = await this.get<TBudget[]>("/api/budget");
    return response.data;
  }

  async createBudget(data: CreateBudgetPayload): Promise<TBudget> {
    const response = await this.post<TBudget>("/api/budget", data);
    return response.data;
  }

  async setBudgetLimit(budgetId: string, effectiveFrom: string, amount: number): Promise<TBudget> {
    const response = await this.put<TBudget>(`/api/budget/${budgetId}/limits/${effectiveFrom}`, { amount });
    return response.data;
  }

  async deleteBudget(budgetId: string): Promise<void> {
    await this.delete(`/api/budget/${budgetId}`);
  }
}

export const budgetService = new BudgetService();
