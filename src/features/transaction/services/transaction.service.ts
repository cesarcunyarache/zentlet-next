import { APIService } from "@/core/services/api.service";
import type { TTransaction, TTransactionPayload } from "../types";

/**
 * Capa de acceso a la API de movimientos. Sólo HTTP: sin estado de React,
 * sin cache y sin transformar errores (se propaga el `AxiosError`).
 */
export class TransactionService extends APIService {
  async getTransactions(): Promise<TTransaction[]> {
    const response = await this.get<TTransaction[]>("/api/transaction");

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
