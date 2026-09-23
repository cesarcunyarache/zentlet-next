import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serializeTransaction } from "@/features/transaction/lib/serialize";
import { createTransactionSchema } from "@/features/transaction/schemas/transaction-api.schema";
import {
  errorResponse,
  getSessionUserId,
  isUniqueViolation,
  parseBody,
  unauthorized,
} from "@/lib/api/route-helpers";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(transactions.map(serializeTransaction));
  } catch {
    return errorResponse("Error fetching transactions", 500);
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

    // La categoría tiene que ser del propio usuario.
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
  } catch {
    return errorResponse("Error creating transaction", 500);
  }
}
