import type { PreferenceUpdate } from "../../../schemas/preference.schema";
import type { PreferenceRepository } from "../../domain/repositories/preference.repository";

export class UpdatePreferencesUseCase {
  constructor(private readonly preferenceRepository: PreferenceRepository) {}

  execute(userId: string, changes: PreferenceUpdate) {
    return this.preferenceRepository.save(userId, changes);
  }
}
