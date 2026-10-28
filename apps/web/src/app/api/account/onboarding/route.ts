import { NextResponse } from "next/server";
import { getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";
import { onboardingUseCases } from "@/features/onboarding/server/infrastructure/onboarding.container";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    await onboardingUseCases.complete.execute(userId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error completing onboarding");
  }
}
