import { NextResponse } from "next/server";
import { billingUseCases } from "@/features/billing/server/infrastructure/billing.container";
import { errorResponse, internalError } from "@/lib/api/route-helpers";

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { provider } = await params;
    const outcome = await billingUseCases.handleWebhook.execute(provider, req);
    if (outcome === "invalid") return errorResponse("Invalid notification", 401);
    return NextResponse.json({ outcome });
  } catch (error) {
    return internalError(req, error, "Error processing billing webhook");
  }
}
