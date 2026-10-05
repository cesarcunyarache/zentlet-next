-- CreateTable
CREATE TABLE "gmail_connection" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "historyId" BIGINT,
    "watchExpiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmail_connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gmail_connection_email_key" ON "gmail_connection"("email");

-- CreateIndex
CREATE UNIQUE INDEX "gmail_connection_userId_key" ON "gmail_connection"("userId");

-- AddForeignKey
ALTER TABLE "gmail_connection" ADD CONSTRAINT "gmail_connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
