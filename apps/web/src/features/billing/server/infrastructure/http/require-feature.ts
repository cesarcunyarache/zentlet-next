import { NextResponse } from "next/server";
import type { Feature } from "../../../lib/plans";
import { billingUseCases } from "../billing.container";

export const UPGRADE_REQUIRED = "Upgrade required";

export async function requireFeature(userId: string, feature: Feature) {
  const allowed = await billingUseCases.hasFeature.execute(userId, feature);
  if (allowed) return null;
  return NextResponse.json({ message: UPGRADE_REQUIRED, feature }, { status: 403 });
}
