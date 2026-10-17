import type { PreferenceRepository } from "../../domain/repositories/preference.repository";

export class GetPreferencesUseCase {
  constructor(private readonly preferenceRepository: PreferenceRepository) {}

  execute(userId: string) {
    return this.preferenceRepository.find(userId);
  }
}
