import type { EmailHeader, InboundEmail } from "../types";

interface GmailMessagePart {
  mimeType?: string;
  headers?: EmailHeader[];
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
}

export interface GmailMessage {
  id: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: GmailMessagePart;
}

const SKIPPED_LABELS = new Set(["DRAFT", "SENT", "SPAM", "TRASH", "CHAT"]);

export function isIncomingMessage(labelIds: string[] | undefined) {
  return !(labelIds ?? []).some((label) => SKIPPED_LABELS.has(label));
}

export function gmailHeader(message: GmailMessage, name: string) {
  const lower = name.toLowerCase();
  return message.payload?.headers?.find((header) => header.name.toLowerCase() === lower)?.value ?? "";
}

function decodeBody(data: string | undefined) {
  return data ? Buffer.from(data, "base64url").toString("utf8") : "";
}

function collectBodies(part: GmailMessagePart | undefined, bodies: { text: string[]; html: string[] }) {
  if (!part) return bodies;
  if (part.mimeType === "text/plain") bodies.text.push(decodeBody(part.body?.data));
  else if (part.mimeType === "text/html") bodies.html.push(decodeBody(part.body?.data));
  part.parts?.forEach((child) => collectBodies(child, bodies));
  return bodies;
}

function receivedAt(message: GmailMessage, now: Date) {
  const millis = Number(message.internalDate);
  return Number.isFinite(millis) && millis > 0 ? new Date(millis) : now;
}

export function fromGmailMessage(message: GmailMessage, now = new Date()): InboundEmail {
  const bodies = collectBodies(message.payload, { text: [], html: [] });
  return {
    messageId: `gmail:${message.id}`,
    from: gmailHeader(message, "From"),
    recipients: [],
    subject: gmailHeader(message, "Subject"),
    text: bodies.text.join("\n"),
    html: bodies.html.join("\n"),
    headers: message.payload?.headers ?? [],
    receivedAt: receivedAt(message, now),
  };
}
