-- CreateEnum
CREATE TYPE "TransactionListRole" AS ENUM ('owner', 'editor', 'viewer');

-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "listId" TEXT;

-- CreateTable
CREATE TABLE "transaction_list" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_list_member" (
    "listId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TransactionListRole" NOT NULL DEFAULT 'viewer',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_list_member_pkey" PRIMARY KEY ("listId","userId")
);

-- CreateTable
CREATE TABLE "transaction_list_invite" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "role" "TransactionListRole" NOT NULL DEFAULT 'viewer',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_list_invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_list_ownerId_idx" ON "transaction_list"("ownerId");

-- CreateIndex
CREATE INDEX "transaction_list_member_userId_idx" ON "transaction_list_member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_list_invite_tokenHash_key" ON "transaction_list_invite"("tokenHash");

-- CreateIndex
CREATE INDEX "transaction_list_invite_listId_idx" ON "transaction_list_invite"("listId");

-- CreateIndex
CREATE INDEX "transaction_listId_transactionDate_createdAt_id_idx" ON "transaction"("listId", "transactionDate" DESC, "createdAt" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_listId_fkey" FOREIGN KEY ("listId") REFERENCES "transaction_list"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_list" ADD CONSTRAINT "transaction_list_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_list_member" ADD CONSTRAINT "transaction_list_member_listId_fkey" FOREIGN KEY ("listId") REFERENCES "transaction_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_list_member" ADD CONSTRAINT "transaction_list_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_list_invite" ADD CONSTRAINT "transaction_list_invite_listId_fkey" FOREIGN KEY ("listId") REFERENCES "transaction_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_list_invite" ADD CONSTRAINT "transaction_list_invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
