-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('RELEASE', 'EXPERIMENT', 'OPERATIONAL', 'KILL_SWITCH', 'PERMISSION');

-- CreateTable
CREATE TABLE "feature" (
    "slug" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "type" "FeatureType" NOT NULL DEFAULT 'RELEASE',
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "feature_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "user_feature" (
    "userId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_feature_pkey" PRIMARY KEY ("userId","featureId")
);

-- CreateIndex
CREATE INDEX "feature_enabled_idx" ON "feature"("enabled");

-- CreateIndex
CREATE INDEX "feature_stale_idx" ON "feature"("stale");

-- CreateIndex
CREATE INDEX "user_feature_featureId_idx" ON "user_feature"("featureId");

-- AddForeignKey
ALTER TABLE "user_feature" ADD CONSTRAINT "user_feature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feature" ADD CONSTRAINT "user_feature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "feature"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
