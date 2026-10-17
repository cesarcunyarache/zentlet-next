import { CompleteOnboardingUseCase } from "../application/use-cases/complete-onboarding.use-case";
import { PrismaOnboardingRepository } from "./persistence/prisma/prisma-onboarding.repository";

const repository = new PrismaOnboardingRepository();

export const onboardingUseCases = {
  complete: new CompleteOnboardingUseCase(repository),
};
