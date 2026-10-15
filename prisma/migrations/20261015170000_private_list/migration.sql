-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_listId_fkey";

-- DropForeignKey
ALTER TABLE "transaction_list" DROP CONSTRAINT "transaction_list_ownerId_fkey";

-- AlterTable
ALTER TABLE "transaction_list" ADD COLUMN     "privateOwnerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transaction_list_privateOwnerId_key" ON "transaction_list"("privateOwnerId");

-- Backfill: una lista privada por usuario
INSERT INTO "transaction_list" ("id", "name", "icon", "color", "currency", "ownerId", "privateOwnerId", "updatedAt")
SELECT gen_random_uuid()::text, 'Privada', '🔒', '#E2E8F0', COALESCE(p."currency", 'PEN'), u."id", u."id", CURRENT_TIMESTAMP
FROM "user" u
LEFT JOIN "user_preference" p ON p."userId" = u."id";

INSERT INTO "transaction_list_member" ("listId", "userId", "role")
SELECT l."id", l."ownerId", 'owner'
FROM "transaction_list" l
WHERE l."privateOwnerId" IS NOT NULL;

-- Backfill: los movimientos sin lista pasan a la privada de su autor
UPDATE "transaction" t
SET "listId" = l."id"
FROM "transaction_list" l
WHERE t."listId" IS NULL AND l."privateOwnerId" = t."userId";

-- AlterTable
ALTER TABLE "transaction" ALTER COLUMN "listId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_listId_fkey" FOREIGN KEY ("listId") REFERENCES "transaction_list"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_list" ADD CONSTRAINT "transaction_list_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
