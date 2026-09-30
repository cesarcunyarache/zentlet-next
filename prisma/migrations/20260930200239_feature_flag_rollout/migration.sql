-- AlterTable
ALTER TABLE "feature" ADD COLUMN     "rollout" INTEGER NOT NULL DEFAULT 100;

-- AddCheckConstraint
ALTER TABLE "feature" ADD CONSTRAINT "feature_rollout_range" CHECK ("rollout" BETWEEN 0 AND 100);
