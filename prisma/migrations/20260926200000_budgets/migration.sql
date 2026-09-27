-- CreateTable
CREATE TABLE "budget" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'recurring',
    "periodUnit" TEXT NOT NULL DEFAULT 'month',
    "periodCount" INTEGER NOT NULL DEFAULT 1,
    "startDate" DATE NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_limit" (
    "budgetId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_limit_pkey" PRIMARY KEY ("budgetId","effectiveFrom")
);

-- CreateIndex
CREATE UNIQUE INDEX "budget_categoryId_key" ON "budget"("categoryId");

-- CreateIndex
CREATE INDEX "budget_userId_idx" ON "budget"("userId");

-- AddForeignKey
ALTER TABLE "budget" ADD CONSTRAINT "budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget" ADD CONSTRAINT "budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_limit" ADD CONSTRAINT "budget_limit_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

