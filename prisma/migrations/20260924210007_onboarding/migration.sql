-- AlterTable
ALTER TABLE "user" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3);

-- Las cuentas que ya existían no son nuevas: no ven el recorrido de bienvenida
UPDATE "user" SET "onboardingCompletedAt" = "createdAt" WHERE "onboardingCompletedAt" IS NULL;
