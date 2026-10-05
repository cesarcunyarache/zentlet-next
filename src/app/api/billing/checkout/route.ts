import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { siteConfig } from "@/lib/site";
import { trackServerEvent } from "@/lib/observability/server";
import { checkoutSchema } from "@/features/billing/schemas/billing-api.schema";
import { startCheckout } from "@/features/billing/server/checkout";
import {
  errorResponse,
  getSessionUserId,
  internalError,
  parseBody,
  unauthorized,
  writeLimit,
} from "@/lib/api/route-helpers";

const RETURN_URL = `${siteConfig.url}${siteConfig.routes.app}?billing=return`;

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, checkoutSchema);
    if ("error" in parsed) return parsed.error;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return unauthorized();

    const outcome = await startCheckout({
      userId,
      email: user.email,
      planKey: parsed.data.planKey,
      returnUrl: RETURN_URL,
    });
    if (outcome.kind === "already_subscribed") return errorResponse("Already subscribed", 409);
    if (outcome.kind === "in_progress") return errorResponse("Checkout in progress", 409);

    trackServerEvent(userId, "checkout_started", { plan: parsed.data.planKey });
    return NextResponse.json({ redirectUrl: outcome.checkoutUrl });
  } catch (error) {
    return internalError(req, error, "Error starting checkout");
  }
}
