import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { serializeTransaction } from "@/features/transaction/lib/serialize";

async function getSessionUserId(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user.id ?? null;
}

const unauthorized = () =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

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
    return NextResponse.json(
      { message: "Error fetching transactions" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { description, amount, type, categoryId, transactionDate, reference } =
      await req.json();

    // La categoría tiene que ser del propio usuario.
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json(
        { message: "Category not found" },
        { status: 422 },
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        description,
        amount,
        type,
        categoryId,
        reference: reference ?? null,
        transactionDate: new Date(transactionDate),
        userId,
      },
    });

    return NextResponse.json(serializeTransaction(transaction), {
      status: 201,
    });
  } catch {
    return NextResponse.json(
      { message: "Error creating transaction" },
      { status: 500 },
    );
  }
}
