-- CreateIndex
CREATE INDEX "transaction_userId_transactionDate_createdAt_id_idx" ON "transaction"("userId", "transactionDate" DESC, "createdAt" DESC, "id" DESC);
