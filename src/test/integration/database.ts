import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { isTestDatabase } from "./test-database-url";

async function assertTestDatabase() {
  const [{ name }] = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  if (!isTestDatabase(name)) throw new Error(`Refusing to truncate "${name}"`);
}

export async function resetDatabase() {
  await assertTestDatabase();
  await prisma.$executeRawUnsafe(
    'TRUNCATE "billing_event", "billing_payment", "subscription", "usage_limit", "user" CASCADE',
  );
}

export async function createUser() {
  const id = randomUUID();
  return prisma.user.create({ data: { id, name: "Ana", email: `${id}@example.com` } });
}
