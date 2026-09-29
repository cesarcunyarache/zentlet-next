import { APIService } from "@/core/services/api.service";
import type { PreferenceUpdate, Preferences } from "../schemas/preference.schema";

export class PreferenceService extends APIService {
  async getPreferences(): Promise<Preferences | null> {
    const response = await this.get<Preferences | null>("/api/account/preferences");

    return response.data;
  }

  async updatePreferences(update: PreferenceUpdate): Promise<Preferences> {
    const response = await this.patch<Preferences>("/api/account/preferences", update);

    return response.data;
  }
}

export const preferenceService = new PreferenceService();
