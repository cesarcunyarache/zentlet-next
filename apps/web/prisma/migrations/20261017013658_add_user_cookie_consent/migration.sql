-- CreateTable
CREATE TABLE "user_cookie_consent" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "granted" TEXT[],
    "policyVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "userAgent" VARCHAR(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_cookie_consent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_cookie_consent_visitorId_createdAt_idx" ON "user_cookie_consent"("visitorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "user_cookie_consent_userId_createdAt_idx" ON "user_cookie_consent"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "user_cookie_consent" ADD CONSTRAINT "user_cookie_consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
