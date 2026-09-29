import { accountService } from "@/features/account/services/account.service";
import type { PreferenceUpdate } from "../schemas/preference.schema";
import { addPendingPreferences, clearPendingPreferences } from "./pending";

export async function savePreferences(userId: string, update: PreferenceUpdate) {
  addPendingPreferences(userId, update);
  await accountService.updatePreferences(update);
  clearPendingPreferences(userId, update);
}
