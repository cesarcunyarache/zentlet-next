import { APIService } from "@/core/services/api.service";
import type {
  DateRange,
  TTransaction,
  TTransactionPayload,
  TransactionFilters,
  TransactionPage,
  TransactionSummaryResponse,
} from "../types";

const BASE_URL = "/api/transaction";

const isEmpty = (value: unknown) => value === undefined || value === null || value === "";

function withoutEmpty(params: object) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => !isEmpty(value)));
}

class TransactionService extends APIService {
  async getTransactionPage(
    params: TransactionFilters & { cursor?: string | null; limit: number },
  ): Promise<TransactionPage> {
    const response = await this.get<TransactionPage>(BASE_URL, withoutEmpty(params));
    return response.data;
  }

  async getSummary(range: DateRange, ids: string[] = []): Promise<TransactionSummaryResponse> {
    const response = await this.get<TransactionSummaryResponse>(
      `${BASE_URL}/summary`,
      withoutEmpty({ ...range, ids: ids.join(",") }),
    );
    return response.data;
  }

  async getTransaction(transactionId: string): Promise<TTransaction> {
    const response = await this.get<TTransaction>(`${BASE_URL}/${transactionId}`);
    return response.data;
  }

  async createTransaction(data: TTransaction): Promise<TTransaction> {
    const response = await this.post<TTransaction>(BASE_URL, data);
    return response.data;
  }

  async updateTransaction(transactionId: string, data: Partial<TTransactionPayload>): Promise<TTransaction> {
    const response = await this.patch<TTransaction>(`${BASE_URL}/${transactionId}`, data);
    return response.data;
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    await this.delete(`${BASE_URL}/${transactionId}`);
  }
}

export const transactionService = new TransactionService();
