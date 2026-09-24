import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { transactionSummaryQuerySchema } from "@/features/transaction/schemas/transaction-api.schema";
import { summaryWhere, toSummary } from "@/features/transaction/lib/feed-query";
import { getSessionUserId, internalError, parseQuery, unauthorized } from "@/lib/api/route-helpers";
import type { TransactionSummaryResponse } from "@/features/transaction/types";

/** Totales del periodo agrupados por categoría y tipo: un resultado pequeño con cualquier volumen. */
export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const parsed = parseQuery(req, transactionSummaryQuerySchema);
    if ("error" in parsed) return parsed.error;

    const { ids, ...range } = parsed.data;
    const [groups, present] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["categoryId", "type"],
        where: summaryWhere(userId, range),
        _sum: { amount: true },
        _count: { _all: true },
      }),
      ids.length
        ? prisma.transaction.findMany({ where: { userId, id: { in: ids } }, select: { id: true } })
        : [],
    ]);

    const body: TransactionSummaryResponse = {
      ...toSummary(groups),
      presentIds: present.map((row) => row.id),
    };
    return NextResponse.json(body);
  } catch (error) {
    return internalError(req, error, "Error summarizing transactions");
  }
}
