import { NextResponse } from "next/server";
import { runInBackground } from "@/lib/background";
import { errorResponse, internalError } from "@/lib/api/route-helpers";
import { processMessages, receiveWebhook, verifySubscription } from "@/features/whatsapp/server/infrastructure/http/whatsapp-webhook";

export function GET(req: Request) {
  const challenge = verifySubscription(new URL(req.url).searchParams);
  if (challenge === "unavailable") return errorResponse("WhatsApp is not available", 404);
  if (challenge === null) return errorResponse("Forbidden", 403);
  return new Response(challenge, { headers: { "Content-Type": "text/plain" } });
}

export async function POST(req: Request) {
  try {
    const received = receiveWebhook(await req.text(), req.headers.get("x-hub-signature-256"));
    if (received === "unavailable") return errorResponse("WhatsApp is not available", 404);
    if (received === "unauthorized") return errorResponse("Unauthorized", 401);
    if (received.length) runInBackground(() => processMessages(received));
    return NextResponse.json({ received: received.length });
  } catch (error) {
    return internalError(req, error, "Error receiving WhatsApp webhook");
  }
}
