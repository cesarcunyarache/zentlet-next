interface PushEnvelope {
  message?: { data?: unknown };
}

function decodeEmailAddress(data: string) {
  try {
    const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf8")) as { emailAddress?: unknown };
    return typeof decoded.emailAddress === "string" ? decoded.emailAddress.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function readPushEmailAddress(payload: unknown) {
  const data = (payload as PushEnvelope | null)?.message?.data;
  return typeof data === "string" ? decodeEmailAddress(data) : null;
}
