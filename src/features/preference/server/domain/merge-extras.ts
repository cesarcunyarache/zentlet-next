import type { PreferenceExtras } from "../../schemas/preference.schema";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeExtras(stored: unknown, changes: PreferenceExtras) {
  return { ...(isRecord(stored) ? stored : {}), ...changes };
}
