-- DropIndex
DROP INDEX "budget_categoryId_key";

-- AlterTable
ALTER TABLE "budget" ADD COLUMN "listId" TEXT;

-- Backfill: los presupuestos existentes pasan a la lista privada de su dueño
UPDATE "budget" b
SET "listId" = l."id"
FROM "transaction_list" l
WHERE l."privateOwnerId" = b."userId";

ALTER TABLE "budget" ALTER COLUMN "listId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "budget_listId_categoryId_key" ON "budget"("listId", "categoryId");

-- AddForeignKey
ALTER TABLE "budget" ADD CONSTRAINT "budget_listId_fkey" FOREIGN KEY ("listId") REFERENCES "transaction_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;
