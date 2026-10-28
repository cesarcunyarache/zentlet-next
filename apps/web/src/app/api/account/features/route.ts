import { NextResponse } from "next/server";
import { getSessionUserId, internalError, unauthorized } from "@/lib/api/route-helpers";
import { featureFlagUseCases } from "@/features/feature-flag/server/infrastructure/feature-flag.container";
import type { FeatureFlags } from "@/features/feature-flag/schemas/feature-flag.schema";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const body: FeatureFlags = { enabled: await featureFlagUseCases.getEnabled.execute(userId) };
    return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return internalError(req, error, "Error loading feature flags");
  }
}
