import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createFeedbackSchema } from "@/features/feedback/schemas/feedback-api.schema";
import { getSessionUserId, internalError, parseBody, tooManyRequests, unauthorized } from "@/lib/api/route-helpers";

const FEEDBACK_PER_HOUR = 10;
const HOUR_SECONDS = 60 * 60;

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { allowed } = await rateLimit(`feedback:${userId}`, FEEDBACK_PER_HOUR, HOUR_SECONDS * 1000);
    if (!allowed) return tooManyRequests("Too many requests", HOUR_SECONDS);

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
