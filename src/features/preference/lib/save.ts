import { preferenceService } from "../services/preference.service";
import type { PreferenceUpdate } from "../schemas/preference.schema";
import { addPendingPreferences, clearPendingPreferences } from "./pending";

export async function savePreferences(userId: string, update: PreferenceUpdate) {
  addPendingPreferences(userId, update);
  await preferenceService.updatePreferences(update);
  clearPendingPreferences(userId, update);
}
