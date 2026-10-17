import { safeEqual } from "@/lib/crypto";
import { readPushEmailAddress } from "../../../lib/gmail-push";
import { inboxUseCases } from "../inbox.container";

export async function handleGmailPush(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!safeEqual(process.env.GMAIL_PUSH_SECRET?.trim(), token)) return "unauthorized" as const;

  const payload = await req.json().catch(() => null);
  const email = readPushEmailAddress(payload);
  if (!email) return "invalid" as const;

  return inboxUseCases.syncGmailPush.execute(email);
}
