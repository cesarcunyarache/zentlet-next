import { APIService } from "@/core/services/api.service";
import type { FeatureFlags } from "../schemas/feature-flag.schema";

export class FeatureFlagService extends APIService {
  async getFlags(): Promise<FeatureFlags> {
    const response = await this.get<FeatureFlags>("/api/account/features");

    return response.data;
  }
}

export const featureFlagService = new FeatureFlagService();
