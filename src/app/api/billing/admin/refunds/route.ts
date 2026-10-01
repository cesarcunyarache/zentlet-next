import { NextResponse } from "next/server";
import { refundSchema } from "@/features/billing/schemas/billing-api.schema";
import { refundPayment } from "@/features/billing/server/payments";
import { errorResponse, hasBearerSecret, internalError, parseBody, unauthorized } from "@/lib/api/route-helpers";

const REFUND_ERRORS = {
  not_found: { message: "Payment not found", status: 404 },
  not_refundable: { message: "Payment is not refundable", status: 422 },
  conflict: { message: "Payment changed during the refund, retry", status: 409 },
};

export async function POST(req: Request) {
  if (!hasBearerSecret(req, process.env.BILLING_ADMIN_SECRET)) return unauthorized();

  try {
    const parsed = await parseBody(req, refundSchema);
    if ("error" in parsed) return parsed.error;

    const outcome = await refundPayment(parsed.data);
    if (outcome.kind !== "refunded") {
      const { message, status } = REFUND_ERRORS[outcome.kind];
      return errorResponse(message, status);
    }
    return NextResponse.json(outcome);
  } catch (error) {
    return internalError(req, error, "Error refunding payment");
  }
}
