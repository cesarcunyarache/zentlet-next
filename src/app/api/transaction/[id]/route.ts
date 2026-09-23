import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serializeTransaction } from "@/features/transaction/lib/serialize";
import { updateTransactionSchema } from "@/features/transaction/schemas/transaction-api.schema";
import { errorResponse, getSessionUserId, parseBody, unauthorized } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

const notFound = () => errorResponse("Transaction not found", 404);

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const transaction = await prisma.transaction.findFirst({
      where: { id, userId },
    });

    if (!transaction) return notFound();

    return NextResponse.json(serializeTransaction(transaction));
  } catch {
    return errorResponse("Error fetching transaction", 500);
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const parsed = await parseBody(req, updateTransactionSchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;

    if (body.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, userId },
        select: { id: true },
      });
      if (!category) return errorResponse("Category not found", 422);
    }

    const { count } = await prisma.transaction.updateMany({
      where: { id, userId },
      data: {
        description: body.description,
        amount: body.amount,
        type: body.type,
        categoryId: body.categoryId,
        reference: body.reference,
        transactionDate: body.transactionDate ? new Date(body.transactionDate) : undefined,
      },
    });

    if (count === 0) return notFound();

    const transaction = await prisma.transaction.findUniqueOrThrow({
      where: { id },
    });

    return NextResponse.json(serializeTransaction(transaction));
  } catch {
    return errorResponse("Error updating transaction", 500);
  }
}

/** 404 si no existe: el cliente lo trata como éxito (ya estaba borrado). */
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const { count } = await prisma.transaction.deleteMany({
      where: { id, userId },
    });

    if (count === 0) return notFound();

    return new NextResponse(null, { status: 204 });
  } catch {
    return errorResponse("Error deleting transaction", 500);
  }
}
