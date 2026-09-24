import { APIService } from "@/core/services/api.service";
import type {
  DateRange,
  TTransaction,
  TTransactionPayload,
  TransactionFilters,
  TransactionPage,
  TransactionSummaryResponse,
} from "../types";

/** Los parámetros vacíos no viajan en la URL. */
function withoutEmpty(params: object) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

/**
 * Capa de acceso a la API de movimientos. Sólo HTTP: sin estado de React,
 * sin cache y sin transformar errores (se propaga el `AxiosError`).
 */
export class TransactionService extends APIService {
  async getTransactionPage(
    params: TransactionFilters & { cursor?: string | null; limit: number },
  ): Promise<TransactionPage> {
    const response = await this.get<TransactionPage>("/api/transaction", withoutEmpty(params));

    return response.data;
  }

  async getSummary(range: DateRange, ids: string[] = []): Promise<TransactionSummaryResponse> {
    const response = await this.get<TransactionSummaryResponse>(
      "/api/transaction/summary",
      withoutEmpty({ ...range, ids: ids.join(",") }),
    );

    return response.data;
  }

  async getTransaction(transactionId: string): Promise<TTransaction> {
    const response = await this.get<TTransaction>(
      `/api/transaction/${transactionId}`,
    );

    return response.data;
  }

  /** Idempotente: el id viaja en el cuerpo y repetirlo no duplica. */
  async createTransaction(data: TTransaction): Promise<TTransaction> {
    const response = await this.post<TTransaction>("/api/transaction", data);

    return response.data;
  }

  async updateTransaction(
    transactionId: string,
    data: Partial<TTransactionPayload>,
  ): Promise<TTransaction> {
    const response = await this.patch<TTransaction>(
      `/api/transaction/${transactionId}`,
      data,
    );

    return response.data;
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    await this.delete(`/api/transaction/${transactionId}`);
  }
}

/** Instancia única: el servicio no tiene estado propio. */
export const transactionService = new TransactionService();
