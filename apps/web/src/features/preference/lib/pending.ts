import { preferenceUpdateSchema, type PreferenceUpdate } from "../schemas/preference.schema";

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

export function addPendingPreferences(userId: string, update: PreferenceUpdate) {
  writePendingPreferences(userId, { ...readPendingPreferences(userId), ...update });
}

export function clearPendingPreferences(userId: string, confirmed: PreferenceUpdate) {
  const pending = readPendingPreferences(userId);
  const remaining = Object.fromEntries(
    Object.entries(pending).filter(
      ([key, value]) => JSON.stringify(value) !== JSON.stringify(confirmed[key as keyof PreferenceUpdate]),
    ),
  );
  writePendingPreferences(userId, remaining);
}
