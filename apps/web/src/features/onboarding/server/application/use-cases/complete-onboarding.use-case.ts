import type { OnboardingRepository } from "../../domain/repositories/onboarding.repository";

export class CompleteOnboardingUseCase {
  constructor(private readonly onboardingRepository: OnboardingRepository) {}

  execute(userId: string) {
    return this.onboardingRepository.markCompletedOnce(userId, new Date());
  }
}
