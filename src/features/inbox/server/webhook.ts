import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/observability/logger";
import { hasBearerSecret } from "@/lib/api/route-helpers";
import { fromPostmark, postmarkInboundSchema } from "../lib/postmark";
import type { InboundEmail } from "../types";
import { ingestEmail, type IngestOutcome } from "./ingest";

const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024;

type WebhookOutcome = IngestOutcome | "unauthorized" | "unsupported" | "invalid";

const ADAPTERS: Record<string, (payload: unknown) => InboundEmail | null> = {
  postmark: (payload) => {
    const parsed = postmarkInboundSchema.safeParse(payload);
    return parsed.success ? fromPostmark(parsed.data) : null;
  },
};

function hasBasicSecret(req: Request, secret: string | undefined) {
  const given = req.headers.get("authorization");
  if (!secret || !given?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(given.slice(6), "base64").toString();
  const password = Buffer.from(decoded.slice(decoded.indexOf(":") + 1));
  const expected = Buffer.from(secret);
  return password.length === expected.length && timingSafeEqual(password, expected);
}

async function readPayload(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_PAYLOAD_BYTES) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function handleInboundEmail(provider: string, req: Request): Promise<WebhookOutcome> {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!hasBearerSecret(req, secret) && !hasBasicSecret(req, secret)) return "unauthorized";

  const adapter = ADAPTERS[provider];
  if (!adapter) return "unsupported";

  const payload = await readPayload(req);
  const email = payload === null ? null : adapter(payload);
  if (!email) return "invalid";

  const outcome = await ingestEmail(email);
  logger.info({ provider, outcome }, "inbox.email_received");
  return outcome;
}
