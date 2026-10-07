import { NextResponse } from "next/server";
import {
  createTransactionSchema,
  transactionListQuerySchema,
} from "@/features/transaction/schemas/transaction-api.schema";
import { createTransaction, listTransactions } from "@/features/transaction/server/transactions";
import { TRANSACTION_ERRORS } from "@/features/transaction/http/errors";
import { errorFrom, getSessionUserId, internalError, parseBody, parseQuery, unauthorized, writeLimit } from "@/lib/api/route-helpers";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const parsed = parseQuery(req, transactionListQuerySchema);
    if ("error" in parsed) return parsed.error;

    const result = await listTransactions(userId, parsed.data);
    if ("error" in result) return errorFrom(TRANSACTION_ERRORS, result.error);
    return NextResponse.json(result.page);
  } catch (error) {
    return internalError(req, error, "Error fetching transactions");
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, createTransactionSchema);
    if ("error" in parsed) return parsed.error;

    const result = await createTransaction(userId, parsed.data);
    if ("error" in result) return errorFrom(TRANSACTION_ERRORS, result.error);
    return NextResponse.json(result.transaction, { status: result.created ? 201 : 200 });
  } catch (error) {
    return internalError(req, error, "Error creating transaction");
  }
}
