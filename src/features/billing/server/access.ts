import { can } from "../lib/entitlements";
import type { Feature } from "../lib/plans";
import { getEffectivePlan } from "./subscriptions";

export async function hasFeature(userId: string, feature: Feature) {
  return can(await getEffectivePlan(userId), feature);
}
