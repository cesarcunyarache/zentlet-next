import { NextResponse } from "next/server";
import { updateTransactionSchema } from "@/features/transaction/schemas/transaction-api.schema";
import { deleteTransaction, getTransaction, updateTransaction } from "@/features/transaction/server/transactions";
import { TRANSACTION_ERRORS } from "@/features/transaction/http/errors";
import { errorFrom, getSessionUserId, internalError, parseBody, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const result = await getTransaction(userId, id);
    if ("error" in result) return errorFrom(TRANSACTION_ERRORS, result.error);
    return NextResponse.json(result.transaction);
  } catch (error) {
    return internalError(req, error, "Error fetching transaction");
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, updateTransactionSchema);
    if ("error" in parsed) return parsed.error;

    const { id } = await params;
    const result = await updateTransaction(userId, id, parsed.data);
    if ("error" in result) return errorFrom(TRANSACTION_ERRORS, result.error);
    return NextResponse.json(result.transaction);
  } catch (error) {
    return internalError(req, error, "Error updating transaction");
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const { id } = await params;
    const result = await deleteTransaction(userId, id);
    if ("error" in result) return errorFrom(TRANSACTION_ERRORS, result.error);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error deleting transaction");
  }
}
