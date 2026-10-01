import { NextResponse } from "next/server";
import { handleInboundEmail } from "@/features/inbox/server/webhook";
import { errorResponse, internalError } from "@/lib/api/route-helpers";

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { provider } = await params;
    const outcome = await handleInboundEmail(provider, req);
    if (outcome === "unauthorized") return errorResponse("Unauthorized", 401);
    if (outcome === "unsupported") return errorResponse("Unsupported provider", 404);
    if (outcome === "invalid") return errorResponse("Invalid payload", 422);
    return NextResponse.json({ outcome });
  } catch (error) {
    return internalError(req, error, "Error processing inbound email");
  }
}
