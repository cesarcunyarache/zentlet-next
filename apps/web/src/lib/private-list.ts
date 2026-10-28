import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/db-errors";

/*
 * Todo movimiento pertenece a una lista: cada usuario tiene una privada
 * (`privateOwnerId` único), que no se comparte ni se borra mientras exista la cuenta.
 * Vive aquí porque la usan transaction, recurring, inbox y list sin depender entre sí.
 */

type Db = Prisma.TransactionClient;

const PRIVATE_LIST = { name: "Lista privada", icon: "🔒", color: "#E2E8F0" };
const FALLBACK_CURRENCY = "PEN";
const CONTRIBUTOR_ROLES = ["owner", "editor"] as const;

async function accountCurrency(db: Db, userId: string) {
  const row = await db.userPreference.findUnique({ where: { userId }, select: { currency: true } });
  return row?.currency ?? FALLBACK_CURRENCY;
}

async function findPrivateListId(db: Db, userId: string) {
  const row = await db.transactionList.findUnique({ where: { privateOwnerId: userId }, select: { id: true } });
  return row?.id ?? null;
}

/** Id de la lista privada del usuario; la crea si aún no existe. */
export async function ensurePrivateListId(userId: string, db: Db = prisma): Promise<string> {
  const existing = await findPrivateListId(db, userId);
  if (existing) return existing;

  try {
    const created = await db.transactionList.create({
      data: {
        ...PRIVATE_LIST,
        currency: await accountCurrency(db, userId),
        ownerId: userId,
        privateOwnerId: userId,
        members: { create: { userId, role: "owner" } },
      },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    const raced = isUniqueViolation(error) ? await findPrivateListId(db, userId) : null;
    if (raced) return raced;
    throw error;
  }
}

/**
 * Lista donde guardar un movimiento nuevo: la pedida si el usuario puede aportar
 * en ella (y comparte su moneda, salvo la privada); si no, su privada. Nunca rechaza
 * el movimiento, para que una alta hecha sin conexión no se pierda.
 */
export async function resolveTargetListId(userId: string, requested?: string | null, db: Db = prisma) {
  if (requested) {
    const membership = await db.transactionListMember.findUnique({
      where: { listId_userId: { listId: requested, userId } },
      select: { role: true, list: { select: { currency: true, privateOwnerId: true, archivedAt: true } } },
    });
    const list = membership?.list;
    const canContribute = membership && (CONTRIBUTOR_ROLES as readonly string[]).includes(membership.role);
    if (list && canContribute && !list.archivedAt) {
      if (list.privateOwnerId === userId) return requested;
      if (!list.privateOwnerId && list.currency === (await accountCurrency(db, userId))) return requested;
    }
  }
  return ensurePrivateListId(userId, db);
}

interface MoveScope {
  listId: string;
  userId?: string;
  transactionId?: string;
}

/** Devuelve a la lista privada de cada autor los movimientos de `listId` (o sólo los de un autor o uno concreto). */
export async function moveToPrivateLists(db: Db, { listId, userId, transactionId }: MoveScope) {
  const authors = await db.transaction.findMany({
    where: { listId, ...(userId ? { userId } : {}), ...(transactionId ? { id: transactionId } : {}) },
    distinct: ["userId"],
    select: { userId: true },
  });
  for (const author of authors) await ensurePrivateListId(author.userId, db);

  return db.$executeRaw`
    UPDATE "transaction" AS t
    SET "listId" = l."id", "updatedAt" = NOW()
    FROM "transaction_list" AS l
    WHERE l."privateOwnerId" = t."userId"
      AND t."listId" = ${listId}
      AND l."id" <> ${listId}
      AND (${userId ?? null}::text IS NULL OR t."userId" = ${userId ?? null})
      AND (${transactionId ?? null}::text IS NULL OR t."id" = ${transactionId ?? null})`;
}
