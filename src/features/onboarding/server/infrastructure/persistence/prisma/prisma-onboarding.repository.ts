import prisma from "@/lib/prisma";
import type { OnboardingRepository } from "../../../domain/repositories/onboarding.repository";

export class PrismaOnboardingRepository implements OnboardingRepository {
  async markCompletedOnce(userId: string, completedAt: Date) {
    await prisma.user.updateMany({
      where: { id: userId, onboardingCompletedAt: null },
      data: { onboardingCompletedAt: completedAt },
    });
  }
}
