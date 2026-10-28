import { APIService } from "@/core/services/api.service";
import { getApiErrorStatus } from "@/core/services/api-error";
import type { TRecurringTransaction } from "../types";

const BASE_URL = "/api/recurring-transaction";
const NOT_FOUND = 404;

class RecurringService extends APIService {
  async getRecurringTransaction(id: string): Promise<TRecurringTransaction | null> {
    try {
      return (await this.get<TRecurringTransaction>(`${BASE_URL}/${id}`)).data;
    } catch (error) {
      if (getApiErrorStatus(error) === NOT_FOUND) return null;
      throw error;
    }
  }

  async stopRecurringTransaction(id: string): Promise<void> {
    await this.delete(`${BASE_URL}/${id}`);
  }
}

export const recurringService = new RecurringService();
