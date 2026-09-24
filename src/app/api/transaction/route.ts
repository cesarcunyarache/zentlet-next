import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serializeTransaction } from "@/features/transaction/lib/serialize";
import {
  createTransactionSchema,
  transactionListQuerySchema,
} from "@/features/transaction/schemas/transaction-api.schema";
import {
  FEED_ORDER,
  afterCursor,
  decodeCursor,
  encodeCursor,
  feedWhere,
} from "@/features/transaction/lib/feed-query";
import type { TransactionPage } from "@/features/transaction/types";
import {
  errorResponse,
  getSessionUserId,
  internalError,
  isUniqueViolation,
  parseBody,
  parseQuery,
  unauthorized,
} from "@/lib/api/route-helpers";

/** Una página del feed, filtrada y ordenada en la base de datos. */
export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const parsed = parseQuery(req, transactionListQuerySchema);
    if ("error" in parsed) return parsed.error;
    const { cursor, limit, ...filters } = parsed.data;

    const after = cursor ? decodeCursor(cursor) : null;
    if (cursor && !after) return errorResponse("Invalid cursor", 422);

    const where = feedWhere(userId, filters);
    const rows = await prisma.transaction.findMany({
      where: after ? { AND: [where, afterCursor(after)] } : where,
      orderBy: FEED_ORDER,
      take: limit + 1,
    });

    const items = rows.slice(0, limit);
    const page: TransactionPage = {
      items: items.map(serializeTransaction),
      nextCursor: rows.length > limit ? encodeCursor(items[items.length - 1]) : null,
    };
    return NextResponse.json(page);
  } catch (error) {
    return internalError(req, error, "Error fetching transactions");
  }
}

/**
 * Idempotente por `id` (lo genera el cliente): si el mismo movimiento llega
 * dos veces (reintento tras perder la respuesta, dos pestañas reanudando la
 * cola) se devuelve el existente con 200 en lugar de duplicarlo.
 */
export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const parsed = await parseBody(req, createTransactionSchema);
    if ("error" in parsed) return parsed.error;
    const { id, description, amount, type, categoryId, transactionDate, reference } = parsed.data;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (existing) {
      return existing.userId === userId
        ? NextResponse.json(serializeTransaction(existing), { status: 200 })
        : errorResponse("Transaction id already in use", 409);
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true },
    });
    if (!category) return errorResponse("Category not found", 422);

    try {
      const transaction = await prisma.transaction.create({
        data: {
          id,
          description,
          amount,
          type,
          categoryId,
          reference: reference ?? null,
          transactionDate: new Date(transactionDate),
          userId,
        },
      });
      return NextResponse.json(serializeTransaction(transaction), { status: 201 });
    } catch (error) {
      // carrera: dos peticiones con el mismo id a la vez
      if (!isUniqueViolation(error)) throw error;
      const winner = await prisma.transaction.findFirst({ where: { id, userId } });
      return winner
        ? NextResponse.json(serializeTransaction(winner), { status: 200 })
        : errorResponse("Transaction id already in use", 409);
    }
  } catch (error) {
    return internalError(req, error, "Error creating transaction");
  }
}
