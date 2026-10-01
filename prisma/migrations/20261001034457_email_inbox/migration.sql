-- CreateTable
CREATE TABLE "email_inbox" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verificationCode" TEXT,
    "verificationUrl" TEXT,
    "lastReceivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_inbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbox_sender" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "dismissedCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbox_sender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbox_transaction" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "externalId" TEXT NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "bank" TEXT,
    "subject" TEXT NOT NULL,
    "parser" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isNewSender" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "currency" TEXT,
    "merchant" TEXT,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "isLearned" BOOLEAN NOT NULL DEFAULT false,
    "transactionDate" DATE NOT NULL,
    "cardLast4" TEXT,
    "reference" TEXT,
    "duplicateOfId" TEXT,
    "transactionId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbox_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_rule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_inbox_address_key" ON "email_inbox"("address");

-- CreateIndex
CREATE UNIQUE INDEX "email_inbox_userId_key" ON "email_inbox"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "inbox_sender_userId_address_key" ON "inbox_sender"("userId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "inbox_transaction_transactionId_key" ON "inbox_transaction"("transactionId");

-- CreateIndex
CREATE INDEX "inbox_transaction_userId_status_idx" ON "inbox_transaction"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "inbox_transaction_userId_externalId_key" ON "inbox_transaction"("userId", "externalId");

-- CreateIndex
CREATE INDEX "merchant_rule_categoryId_idx" ON "merchant_rule"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_rule_userId_key_key" ON "merchant_rule"("userId", "key");

-- AddForeignKey
ALTER TABLE "email_inbox" ADD CONSTRAINT "email_inbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbox_sender" ADD CONSTRAINT "inbox_sender_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbox_transaction" ADD CONSTRAINT "inbox_transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_rule" ADD CONSTRAINT "merchant_rule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_rule" ADD CONSTRAINT "merchant_rule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
