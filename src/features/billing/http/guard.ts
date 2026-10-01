import { NextResponse } from "next/server";
import { can } from "../lib/entitlements";
import type { Feature } from "../lib/plans";
import { getEffectivePlan } from "./subscriptions";

export const UPGRADE_REQUIRED = "Upgrade required";

export async function requireFeature(userId: string, feature: Feature) {
  if (can(await getEffectivePlan(userId), feature)) return null;
  return NextResponse.json({ message: UPGRADE_REQUIRED, feature }, { status: 403 });
}
