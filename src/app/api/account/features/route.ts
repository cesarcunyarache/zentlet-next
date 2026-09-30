import { NextResponse } from "next/server";
import { getSessionUserId, internalError, unauthorized } from "@/lib/api/route-helpers";
import { getEnabledFlags } from "@/features/feature-flag/server/flags";
import type { FeatureFlags } from "@/features/feature-flag/schemas/feature-flag.schema";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const body: FeatureFlags = { enabled: await getEnabledFlags(userId) };
    return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return internalError(req, error, "Error loading feature flags");
  }
}
