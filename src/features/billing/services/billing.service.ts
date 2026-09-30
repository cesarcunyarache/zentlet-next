import { APIService } from "@/core/services/api.service";
import type { CheckoutPayload } from "../schemas/billing-api.schema";
import type { BillingSummary } from "../types";

export class BillingService extends APIService {
  async getSummary(): Promise<BillingSummary> {
    const response = await this.get<BillingSummary>("/api/billing/me");
    return response.data;
  }

  async startCheckout(payload: CheckoutPayload): Promise<{ redirectUrl: string }> {
    const response = await this.post<{ redirectUrl: string }>("/api/billing/checkout", payload);
    return response.data;
  }

  async cancel(): Promise<BillingSummary> {
    const response = await this.post<BillingSummary>("/api/billing/cancel");
    return response.data;
  }

  async sync(): Promise<BillingSummary> {
    const response = await this.post<BillingSummary>("/api/billing/sync");
    return response.data;
  }
}

export const billingService = new BillingService();
