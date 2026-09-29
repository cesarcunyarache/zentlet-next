import { APIService } from "@/core/services/api.service";
import type { PreferenceUpdate, Preferences } from "@/features/preference/schemas/preference.schema";

export class AccountService extends APIService {
  async exportData(params: { locale: string; currency: string }): Promise<Blob> {
    const response = await this.get<Blob>("/api/account/export", params, { responseType: "blob" });

    return response.data;
  }

  async completeOnboarding(): Promise<void> {
    await this.post("/api/account/onboarding");
  }

  async getPreferences(): Promise<Preferences | null> {
    const response = await this.get<Preferences | null>("/api/account/preferences");

    return response.data;
  }

  async updatePreferences(update: PreferenceUpdate): Promise<Preferences> {
    const response = await this.patch<Preferences>("/api/account/preferences", update);

    return response.data;
  }
}

export const accountService = new AccountService();
