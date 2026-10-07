import { NextResponse } from "next/server";
import { transactionSummaryQuerySchema } from "@/features/transaction/schemas/transaction-api.schema";
import { summarizeTransactions } from "@/features/transaction/server/transactions";
import { getSessionUserId, internalError, parseQuery, unauthorized } from "@/lib/api/route-helpers";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const parsed = parseQuery(req, transactionSummaryQuerySchema);
    if ("error" in parsed) return parsed.error;

    return NextResponse.json(await summarizeTransactions(userId, parsed.data));
  } catch (error) {
    return internalError(req, error, "Error summarizing transactions");
  }
}
