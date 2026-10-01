import { NextResponse } from "next/server";
import type { Feature } from "../lib/plans";
import { hasFeature } from "../server/access";

export const UPGRADE_REQUIRED = "Upgrade required";

export async function requireFeature(userId: string, feature: Feature) {
  if (await hasFeature(userId, feature)) return null;
  return NextResponse.json({ message: UPGRADE_REQUIRED, feature }, { status: 403 });
}
