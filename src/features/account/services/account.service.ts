import { APIService } from "@/core/services/api.service";

export class AccountService extends APIService {
  async exportData(params: { locale: string; currency: string }): Promise<Blob> {
    const response = await this.get<Blob>("/api/account/export", params, { responseType: "blob" });

    return response.data;
  }

  async completeOnboarding(): Promise<void> {
    await this.post("/api/account/onboarding");
  }
}

export const accountService = new AccountService();
