import type { FeatureFlagRepository } from "../../domain/repositories/feature-flag.repository";

export class ListFlagsUseCase {
  constructor(private readonly featureFlagRepository: FeatureFlagRepository) {}

  execute() {
    return this.featureFlagRepository.findAllWithUsage();
  }
}
