import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { serializeTransaction } from "@/features/transaction/lib/serialize";

type RouteContext = { params: Promise<{ id: string }> };

async function getSessionUserId(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user.id ?? null;
}

const unauthorized = () =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

const notFound = () =>
  NextResponse.json({ message: "Transaction not found" }, { status: 404 });

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
    return NextResponse.json(
      { message: "Error fetching transaction" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const body = await req.json();

    if (body.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, userId },
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json(
          { message: "Category not found" },
          { status: 422 },
        );
      }
    }

    const { count } = await prisma.transaction.updateMany({
      where: { id, userId },
      data: {
        description: body.description,
        amount: body.amount,
        type: body.type,
        categoryId: body.categoryId,
        reference: body.reference,
        transactionDate: body.transactionDate
          ? new Date(body.transactionDate)
          : undefined,
      },
    });

    if (count === 0) return notFound();

    const transaction = await prisma.transaction.findUniqueOrThrow({
      where: { id },
    });

    return NextResponse.json(serializeTransaction(transaction));
  } catch {
    return NextResponse.json(
      { message: "Error updating transaction" },
      { status: 500 },
    );
  }
}

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
    return NextResponse.json(
      { message: "Error deleting transaction" },
      { status: 500 },
    );
  }
}
