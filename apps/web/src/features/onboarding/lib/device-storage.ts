const doneKey = (userId: string) => `zentlet-onboarding-done:${userId}`;

export function isDoneOnDevice(userId: string) {
  try {
    return localStorage.getItem(doneKey(userId)) !== null;
  } catch {
    return false;
  }
}

export function markDoneOnDevice(userId: string) {
  try {
    localStorage.setItem(doneKey(userId), new Date().toISOString());
  } catch {}
}
