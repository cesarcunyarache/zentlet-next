import { preferenceUpdateSchema, type PreferenceExtras, type PreferenceUpdate } from "../schemas/preference.schema";

const pendingKey = (userId: string) => `zentlet.preferences.pending:${userId}`;

export function readPendingPreferences(userId: string): PreferenceUpdate {
  try {
    const parsed = preferenceUpdateSchema.safeParse(JSON.parse(localStorage.getItem(pendingKey(userId)) ?? "{}"));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

function writePendingPreferences(userId: string, pending: PreferenceUpdate) {
  try {
    if (Object.keys(pending).length === 0) localStorage.removeItem(pendingKey(userId));
    else localStorage.setItem(pendingKey(userId), JSON.stringify(pending));
  } catch {}
}

export function mergePreferenceUpdates(base: PreferenceUpdate, update: PreferenceUpdate): PreferenceUpdate {
  const merged = { ...base, ...update };
  if (base.extras || update.extras) merged.extras = { ...base.extras, ...update.extras };
  return merged;
}

export function addPendingPreferences(userId: string, update: PreferenceUpdate) {
  writePendingPreferences(userId, mergePreferenceUpdates(readPendingPreferences(userId), update));
}

function remainingExtras(pending: PreferenceExtras | undefined, confirmed: PreferenceExtras | undefined) {
  const remaining = Object.fromEntries(
    Object.entries(pending ?? {}).filter(([key, value]) => confirmed?.[key as keyof PreferenceExtras] !== value),
  );
  return Object.keys(remaining).length > 0 ? remaining : undefined;
}

export function clearPendingPreferences(userId: string, confirmed: PreferenceUpdate) {
  const { extras, ...fields } = readPendingPreferences(userId);
  const remaining: PreferenceUpdate = Object.fromEntries(
    Object.entries(fields).filter(
      ([key, value]) => JSON.stringify(value) !== JSON.stringify(confirmed[key as keyof PreferenceUpdate]),
    ),
  );
  const remainingExtra = remainingExtras(extras, confirmed.extras);
  if (remainingExtra) remaining.extras = remainingExtra;
  writePendingPreferences(userId, remaining);
}
