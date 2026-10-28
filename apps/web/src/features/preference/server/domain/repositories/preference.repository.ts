import type { PreferenceUpdate, Preferences } from "../../../schemas/preference.schema";

export interface PreferenceRepository {
  find(userId: string): Promise<Preferences | null>;

  save(userId: string, changes: PreferenceUpdate): Promise<Preferences>;

  findTimezone(userId: string): Promise<string | null>;
}
