import { safeEqual } from "@/lib/crypto";
import { logger } from "@/lib/observability/logger";
import { hasBearerSecret } from "@/lib/api/route-helpers";
import { fromPostmark, postmarkInboundSchema } from "../../../lib/postmark";
import type { InboundEmail } from "../../../types";
import type { IngestOutcome } from "../../application/services/email-ingestion.service";
import { inboxUseCases } from "../inbox.container";

const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024;
const BASIC_PREFIX = "Basic ";

type WebhookOutcome = IngestOutcome | "unauthorized" | "unsupported" | "invalid";

const ADAPTERS: Record<string, (payload: unknown) => InboundEmail | null> = {
  postmark: (payload) => {
    const parsed = postmarkInboundSchema.safeParse(payload);
    if (!parsed.success) return null;
    return fromPostmark(parsed.data);
  },
};

function hasBasicSecret(req: Request, secret: string | undefined) {
  const given = req.headers.get("authorization");
  if (!secret || !given?.startsWith(BASIC_PREFIX)) return false;

  const credentials = Buffer.from(given.slice(BASIC_PREFIX.length), "base64").toString();
  const password = credentials.slice(credentials.indexOf(":") + 1);
  return safeEqual(secret, password);
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
  const isAuthorized = hasBearerSecret(req, secret) || hasBasicSecret(req, secret);
  if (!isAuthorized) return "unauthorized";

  const adapter = ADAPTERS[provider];
  if (!adapter) return "unsupported";

  const payload = await readPayload(req);
  if (payload === null) return "invalid";

  const email = adapter(payload);
  if (!email) return "invalid";

  const outcome = await inboxUseCases.receiveEmail.execute(email);
  logger.info({ provider, outcome }, "inbox.email_received");
  return outcome;
}
