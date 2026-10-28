export interface OnboardingRepository {
  markCompletedOnce(userId: string, completedAt: Date): Promise<void>;
}
