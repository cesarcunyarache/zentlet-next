-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');

-- AlterTable
ALTER TABLE "transaction" ADD COLUMN "recurringTransactionId" TEXT;

-- CreateTable
CREATE TABLE "recurring_transaction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "anchorDate" DATE NOT NULL,
    "nextDueDate" DATE NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_transaction_nextDueDate_idx" ON "recurring_transaction"("nextDueDate");

-- CreateIndex
CREATE INDEX "recurring_transaction_userId_idx" ON "recurring_transaction"("userId");

-- CreateIndex
CREATE INDEX "recurring_transaction_categoryId_idx" ON "recurring_transaction"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_recurringTransactionId_transactionDate_key" ON "transaction"("recurringTransactionId", "transactionDate");

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "recurring_transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transaction" ADD CONSTRAINT "recurring_transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transaction" ADD CONSTRAINT "recurring_transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
