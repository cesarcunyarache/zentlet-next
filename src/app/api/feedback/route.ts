import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createFeedbackSchema } from "@/features/feedback/schemas/feedback-api.schema";
import { errorResponse, getSessionUserId, internalError, parseBody, unauthorized } from "@/lib/api/route-helpers";

const FEEDBACK_PER_HOUR = 10;
const HOUR_MS = 60 * 60_000;

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { allowed } = await rateLimit(`feedback:${userId}`, FEEDBACK_PER_HOUR, HOUR_MS);
    if (!allowed) return errorResponse("Too many requests", 429);

    const parsed = await parseBody(req, createFeedbackSchema);
    if ("error" in parsed) return parsed.error;
    const { message, type, context } = parsed.data;

    const feedback = await prisma.feedback.create({
      data: { message, type, context, userId },
      select: { id: true },
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    return internalError(req, error, "Error sending feedback");
  }
}
