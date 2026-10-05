-- DropIndex: prefijo del índice compuesto (userId, transactionDate, createdAt, id)
DROP INDEX "transaction_userId_idx";

-- DropIndex: ninguna query filtra por fecha sin userId
DROP INDEX "transaction_transactionDate_idx";

-- Importes siempre positivos. NOT VALID: se exige a filas nuevas y
-- modificadas sin revisar (ni bloquear) las existentes.
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_amount_positive" CHECK ("amount" > 0) NOT VALID;
ALTER TABLE "budget_limit" ADD CONSTRAINT "budget_limit_amount_positive" CHECK ("amount" > 0) NOT VALID;

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "checkoutUrl" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "status" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "refundedAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_event" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "externalId" TEXT,
    "resourceId" TEXT,
    "userId" TEXT,
    "subscriptionId" TEXT,
    "data" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_userId_status_idx" ON "subscription"("userId", "status");

-- CreateIndex
CREATE INDEX "subscription_status_updatedAt_idx" ON "subscription"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_provider_externalId_key" ON "subscription"("provider", "externalId");

-- CreateIndex
CREATE INDEX "billing_payment_subscriptionId_createdAt_idx" ON "billing_payment"("subscriptionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_provider_externalId_key" ON "billing_payment"("provider", "externalId");

-- CreateIndex
CREATE INDEX "billing_event_subscriptionId_createdAt_idx" ON "billing_event"("subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "billing_event_userId_createdAt_idx" ON "billing_event"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "billing_event_provider_externalId_key" ON "billing_event"("provider", "externalId");

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment" ADD CONSTRAINT "billing_payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "subscription_one_live_per_user" ON "subscription"("userId") WHERE "status" IN ('pending', 'trialing', 'active', 'past_due');

ALTER TABLE "subscription" ADD CONSTRAINT "subscription_status_check" CHECK ("status" IN ('pending', 'trialing', 'active', 'past_due', 'canceled'));
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "billing_payment" ADD CONSTRAINT "billing_payment_status_check" CHECK ("status" IN ('pending', 'approved', 'failed', 'refunded', 'partially_refunded'));
ALTER TABLE "billing_payment" ADD CONSTRAINT "billing_payment_refund_range" CHECK ("refundedAmount" >= 0 AND "refundedAmount" <= "amount");
